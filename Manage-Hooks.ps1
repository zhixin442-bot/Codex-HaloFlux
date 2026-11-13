#Requires -Version 7.4
[CmdletBinding()]
param(
    [ValidateSet('Plan', 'Install', 'Start', 'Disable', 'Uninstall')]
    [string] $Action = 'Plan',
    [switch] $Approve,
    [ValidateRange(1024, 65535)]
    [int] $Port = 49373
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'Codex-HaloFlux requires Windows.' }

$codexHome = if ($env:CODEX_HOME) { [IO.Path]::GetFullPath($env:CODEX_HOME) } else { Join-Path $HOME '.codex' }
$local = [IO.Path]::GetFullPath($env:LOCALAPPDATA)
$runtime = Join-Path $local 'Codex-HaloFlux-Community'
$hooksPath = Join-Path $codexHome 'hooks.json'
$configPath = Join-Path $codexHome 'config.toml'
$manifestPath = Join-Path $runtime 'install.json'
$events = @('UserPromptSubmit', 'PreModelRequest', 'PostModelRequest', 'PreToolUse',
    'PostToolUse', 'PermissionRequest', 'Stop', 'Interrupt')
$files = @('server.mjs', 'forward-hook.mjs', 'hook-protocol.mjs', 'live-events.mjs', 'render-page.mjs',
    'activity.js', 'activity.css', 'LICENSE', 'upstream/haloflux/lab.html')
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
$trustedSids = @($identity.Value, 'S-1-5-18', 'S-1-5-32-544')

function Assert-RegularPath([string] $Path) {
    for ($itemPath = $Path; $itemPath; $itemPath = [IO.Path]::GetDirectoryName($itemPath)) {
        $item = Get-Item -LiteralPath $itemPath -Force -ErrorAction SilentlyContinue
        if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw "Reparse points are unsupported here: $itemPath"
        }
    }
}

function Assert-PrivateRuntime {
    Assert-RegularPath $runtime
    $acl = Get-Acl -LiteralPath $runtime
    if (-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $identity.Value) {
        throw 'The runtime directory must be owned by the current user and have a private ACL.'
    }
    foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
        if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin $trustedSids) {
            throw 'The runtime directory grants access to another account.'
        }
    }
}

function New-PrivateRuntime {
    if (-not [IO.Directory]::Exists($runtime)) {
        $acl = [Security.AccessControl.DirectorySecurity]::new()
        $acl.SetOwner($identity)
        $acl.SetAccessRuleProtection($true, $false)
        foreach ($sid in $trustedSids) {
            $principal = [Security.Principal.SecurityIdentifier]::new($sid)
            $rule = [Security.AccessControl.FileSystemAccessRule]::new($principal, 'FullControl',
                'ContainerInherit, ObjectInherit', 'None', 'Allow')
            $acl.AddAccessRule($rule)
        }
        [void][IO.FileSystemAclExtensions]::CreateDirectory($acl, $runtime)
    }
    Assert-PrivateRuntime
}

function Get-Node {
    $node = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $node) { throw 'Install a supported Node.js LTS for Windows and reopen PowerShell.' }
    $signature = Get-AuthenticodeSignature -LiteralPath $node.Source
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.GetNameInfo('SimpleName', $false) -ne 'OpenJS Foundation') {
        throw 'Install the official, Authenticode-signed Node.js Windows distribution from nodejs.org.'
    }
    $oldOptions = $env:NODE_OPTIONS
    $env:NODE_OPTIONS = $null
    try { $version = & $node.Source --version }
    finally { $env:NODE_OPTIONS = $oldOptions }
    if ($LASTEXITCODE -or $version -notmatch '^v(22|24|26)\.') {
        throw 'Use the official Node.js 22, 24 or 26 Windows build. Node.js 24 LTS is the tested release.'
    }
    return $node.Source
}

function Read-TextIfPresent([string] $Path) {
    Assert-RegularPath $Path
    if ([IO.File]::Exists($Path)) { return [IO.File]::ReadAllText($Path) }
    return $null
}

function Convert-Hooks([AllowNull()][string] $Raw, [bool] $Exists) {
    if (-not $Exists) { return ,([System.Text.Json.Nodes.JsonObject]::new()) }
    # The JSON DOM preserves numeric and date-like values.
    $parsed = [System.Text.Json.Nodes.JsonNode]::Parse($Raw, $null, [System.Text.Json.JsonDocumentOptions]::new())
    if ($parsed -isnot [System.Text.Json.Nodes.JsonObject]) { throw 'hooks.json must contain a JSON object.' }
    if ($parsed.ContainsKey('hooks')) {
        if ($parsed['hooks'] -isnot [System.Text.Json.Nodes.JsonObject]) { throw 'The hooks property must be a JSON object.' }
        foreach ($definition in $parsed['hooks'].GetEnumerator()) {
            if ($definition.Value -isnot [System.Text.Json.Nodes.JsonArray]) { throw 'Expected an array of Hook matcher groups.' }
            foreach ($group in $definition.Value) {
                if ($group -isnot [System.Text.Json.Nodes.JsonObject] -or
                    $group['hooks'] -isnot [System.Text.Json.Nodes.JsonArray]) { throw 'Invalid Hook matcher group.' }
                foreach ($handler in $group['hooks']) {
                    if ($handler -isnot [System.Text.Json.Nodes.JsonObject]) { throw 'Invalid Hook handler.' }
                    $null = $handler.Count
                }
            }
        }
    }
    return ,$parsed
}

function Quote-PowerShell([string] $Value) {
    return "'" + $Value.Replace("'", "''").Replace('‘', '‘‘').Replace('’', '’’') + "'"
}

function Get-PackageRevision([string] $NodePath, [string] $Directory) {
    $content = foreach ($relative in $files) {
        (Get-FileHash -LiteralPath (Join-Path $Directory $relative)).Hash
    }
    $content += (Get-FileHash -LiteralPath $NodePath).Hash
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::ASCII.GetBytes(($content -join '')))).ToLowerInvariant()
}

function Get-Group([int] $ListenPort, [string] $Revision) {
    # The fingerprint changes Codex's definition hash when an executable or script changes.
    $command = '$env:NODE_OPTIONS = $null; & ' + (Quote-PowerShell (Join-Path $runtime 'node.exe')) + ' ' +
        (Quote-PowerShell (Join-Path $runtime 'forward-hook.mjs')) + " $ListenPort $Revision"
    $json = [ordered]@{ hooks = @([ordered]@{ type = 'command'; command = $command; async = $true; timeout = 1 }) }
    return ,([System.Text.Json.Nodes.JsonNode]::Parse(($json | ConvertTo-Json -Depth 5 -Compress)))
}

function Find-OwnedGroups($Document, $Group, [bool] $HasManifest) {
    $owned = @{}
    if (-not $Document.ContainsKey('hooks')) { return $owned }
    foreach ($definition in $Document['hooks'].GetEnumerator()) {
        $index = -1
        foreach ($existing in $definition.Value) {
            $index++
            if ($definition.Key -cin $events -and [System.Text.Json.Nodes.JsonNode]::DeepEquals($existing, $Group)) {
                if (-not $HasManifest -or $owned.ContainsKey($definition.Key)) { throw 'Ambiguous HaloFlux Hook ownership. Review the file manually.' }
                $owned[$definition.Key] = $index
                continue
            }
            foreach ($handler in $existing['hooks']) {
                foreach ($property in @('command', 'commandWindows')) {
                    if ($handler[$property] -is [System.Text.Json.Nodes.JsonValue] -and
                        $handler[$property].ToString() -match '(?i)Codex-HaloFlux(?:-Community)?[/\\]') {
                        throw 'Another or edited HaloFlux Hook is present. Review the existing installation before proceeding.'
                    }
                }
            }
        }
    }
    return $owned
}

function Copy-Backup([string] $Path, [string] $Directory, [string] $Name) {
    if ([IO.File]::Exists($Path)) {
        [IO.File]::Copy($Path, (Join-Path $Directory $Name))
    }
}

function Save-Hooks($Original, [bool] $Existed, $Updated) {
    $transaction = [Guid]::NewGuid().ToString('N')
    $stage = Join-Path $codexHome ".haloflux-$transaction.new"
    $displaced = Join-Path $codexHome ".haloflux-$transaction.previous"
    $rejected = Join-Path $codexHome ".haloflux-$transaction.rejected"
    $guard = $null
    try {
        Assert-RegularPath $hooksPath
        if ($Existed) {
            # Deny in-place writers while still allowing the atomic Windows replace.
            $guard = [IO.File]::Open($hooksPath, 'Open', 'Read', ([IO.FileShare]::Read -bor [IO.FileShare]::Delete))
            $reader = [IO.StreamReader]::new($guard, [Text.Encoding]::UTF8, $true, 1024, $true)
            try { $lockedOriginal = $reader.ReadToEnd() }
            finally { $reader.Dispose() }
            if ($lockedOriginal -cne $Original) { throw 'hooks.json changed during review. Re-run Plan and retry.' }
        } elseif ([IO.File]::Exists($hooksPath)) {
            throw 'hooks.json appeared during review. Re-run Plan and retry.'
        }
        if ($null -eq $Updated) {
            [IO.File]::Move($hooksPath, $displaced)
        } else {
            [IO.File]::WriteAllText($stage, $Updated)
            if ($Existed) { [IO.File]::Replace($stage, $hooksPath, $displaced) }
            else { [IO.File]::Move($stage, $hooksPath) }
        }
        if ($Existed -and [IO.File]::ReadAllText($displaced) -cne $Original) {
            if (-not [IO.File]::Exists($hooksPath)) { [IO.File]::Move($displaced, $hooksPath) }
            elseif ((Read-TextIfPresent $hooksPath) -ceq $Updated) {
                [IO.File]::Replace($displaced, $hooksPath, $rejected)
                if ([IO.File]::ReadAllText($rejected) -ceq $Updated) { [IO.File]::Delete($rejected) }
            }
            throw "A concurrent edit was detected. Inspect hooks.json and any preserved conflict copies at $displaced or $rejected before retrying."
        }
        if ($Existed) { [IO.File]::Delete($displaced) }
    } finally {
        if ($guard) { $guard.Dispose() }
        if ([IO.File]::Exists($stage)) { [IO.File]::Delete($stage) }
    }
}

function Assert-Installed($Manifest) {
    foreach ($relative in ($files + @('node.exe', 'event.key'))) {
        $path = Join-Path $runtime $relative
        Assert-RegularPath $path
        if (-not [IO.File]::Exists($path) -or (Get-FileHash -LiteralPath $path).Hash -cne $Manifest.hashes[$relative]) {
            throw "Installed file missing or changed: $relative. Disable the Hooks and review before reinstalling."
        }
    }
}

Assert-RegularPath $hooksPath
Assert-RegularPath $configPath
Assert-RegularPath $runtime
$runtimeExists = [IO.Directory]::Exists($runtime)
if ($runtimeExists) { Assert-PrivateRuntime }
if ($Action -in @('Disable', 'Uninstall') -and -not [IO.File]::Exists($manifestPath)) {
    Write-Output 'No registered HaloFlux installation found.'
    return
}
if (-not [IO.Directory]::Exists($codexHome)) { throw 'Codex home was not found. Open Codex once or set CODEX_HOME.' }

$lock = $null
$running = $null
try {
    if ($Action -in @('Plan', 'Install')) {
        $node = Get-Node
        $packageRevision = Get-PackageRevision $node $PSScriptRoot
    }
    if ($Action -eq 'Install' -and -not $Approve) {
        throw 'Run Plan first, then repeat Install with -Approve to authorize the displayed changes.'
    }
    if ($Action -eq 'Install') { New-PrivateRuntime }
    if ($Action -ne 'Plan') {
        $lockPath = Join-Path $runtime 'manage.lock'
        Assert-RegularPath $lockPath
        $lock = [IO.File]::Open($lockPath, 'OpenOrCreate', 'ReadWrite', 'None')
    }
    $manifestRaw = Read-TextIfPresent $manifestPath
    $manifest = if ($manifestRaw) { ConvertFrom-Json -InputObject $manifestRaw -AsHashtable } else { $null }
    if ($manifest -and ($manifest.version -ne 1 -or $manifest.codexHome -ne $codexHome)) {
        throw 'The runtime belongs to another Codex home or installer version.'
    }
    if ($manifest) {
        if ($PSBoundParameters.ContainsKey('Port') -and $manifest.port -ne $Port) { throw 'Uninstall before changing the port.' }
        $Port = $manifest.port
        $revision = $manifest.revision
        if ($Action -in @('Plan', 'Install') -and $packageRevision -cne $revision) {
            throw 'The package or Node.js has changed. Disable and uninstall the old runtime before upgrading.'
        }
    } else {
        $revision = $packageRevision
    }

    if ($Action -in @('Start', 'Uninstall')) {
        if (-not $manifest) { throw 'Run the installation first.' }
        $runningPath = Join-Path $runtime 'bridge.lock'
        Assert-RegularPath $runningPath
        try { $running = [IO.File]::Open($runningPath, 'OpenOrCreate', 'ReadWrite', 'None') }
        catch { throw 'Stop the HaloFlux bridge with Ctrl+C before starting another bridge or uninstalling.' }
    }
    if ($Action -eq 'Start') {
        Assert-Installed $manifest
        $lock.Dispose()
        $lock = $null
        $oldPort = $env:HALOFLUX_PORT
        $oldOptions = $env:NODE_OPTIONS
        $env:HALOFLUX_PORT = $Port
        $env:NODE_OPTIONS = $null
        try {
            & (Join-Path $runtime 'node.exe') (Join-Path $runtime 'server.mjs') --live
            if ($LASTEXITCODE) { throw "The bridge exited with code $LASTEXITCODE." }
        } finally {
            $env:HALOFLUX_PORT = $oldPort
            $env:NODE_OPTIONS = $oldOptions
        }
        return
    }

    $group = Get-Group $Port $revision
    $raw = Read-TextIfPresent $hooksPath
    $existed = [IO.File]::Exists($hooksPath)
    $document = Convert-Hooks $raw $existed
    $owned = Find-OwnedGroups $document $group ($null -ne $manifest)
    if ($Action -in @('Plan', 'Install')) {
        if ((Read-TextIfPresent $configPath) -match '(?i)Codex-HaloFlux(?:-Community)?[/\\]') {
            throw 'A HaloFlux reference already exists in config.toml. Review it manually.'
        }
    }
    if ($Action -eq 'Plan') {
        Write-Output "Hooks file: $hooksPath" "Private runtime: $runtime" "Bridge: http://127.0.0.1:$Port/wallpaper"
        Write-Output "Add one group for: $($events -join ', ')" ($group['hooks'][0]['command'].ToString()) 'async: true, timeout: 1 second'
        Write-Output "Already present: $($owned.Count). Backups are private. config.toml is left as-is."
        return
    }

    $backupRoot = Join-Path $runtime 'backups'
    Assert-RegularPath $backupRoot
    if ($Action -eq 'Install') {
        if ($manifest) {
            Assert-Installed $manifest
        } else {
            $hashes = @{}
            $created = [Collections.Generic.List[string]]::new()
            try {
                foreach ($relative in ($files + @('node.exe', 'event.key'))) {
                    $destination = Join-Path $runtime $relative
                    Assert-RegularPath $destination
                    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination))
                    if ($relative -eq 'event.key') {
                        $stream = [IO.File]::Open($destination, 'CreateNew', 'Write', 'None')
                        $created.Add($destination)
                        try {
                            $bytes = [Text.Encoding]::ASCII.GetBytes([Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant())
                            $stream.Write($bytes)
                        } finally { $stream.Dispose() }
                    } else {
                        $source = if ($relative -eq 'node.exe') { $node } else { Join-Path $PSScriptRoot $relative }
                        [IO.File]::Copy($source, $destination)
                        $created.Add($destination)
                    }
                    $hashes[$relative] = (Get-FileHash -LiteralPath $destination).Hash
                }
                if ((Get-AuthenticodeSignature -LiteralPath (Join-Path $runtime 'node.exe')).Status -ne 'Valid') {
                    throw 'The private Node.js copy failed signature verification.'
                }
                if ((Get-PackageRevision (Join-Path $runtime 'node.exe') $runtime) -cne $revision) {
                    throw 'The package changed during installation. Run Plan and retry.'
                }
                $emptyEvents = @($events | Where-Object {
                    $document.ContainsKey('hooks') -and $document['hooks'].ContainsKey($_) -and $document['hooks'][$_].Count -eq 0
                })
                $manifest = @{ version = 1; codexHome = $codexHome; port = $Port; revision = $revision
                    originallyExisted = $existed; emptyEvents = $emptyEvents
                    originallyHadHooks = $document.ContainsKey('hooks'); hashes = $hashes }
                $stagedManifest = Join-Path $runtime ([Guid]::NewGuid().ToString('N') + '.manifest-new')
                $created.Add($stagedManifest)
                [IO.File]::WriteAllText($stagedManifest, ($manifest | ConvertTo-Json -Depth 5))
                [IO.File]::Move($stagedManifest, $manifestPath)
            } catch {
                foreach ($createdFile in $created) { [IO.File]::Delete($createdFile) }
                throw
            }
        }
        if ($owned.Count -eq $events.Count) { Write-Output 'HaloFlux Hooks already installed.'; return }
        if (-not $document.ContainsKey('hooks')) { $document['hooks'] = [System.Text.Json.Nodes.JsonObject]::new() }
        foreach ($eventName in $events) {
            if ($owned.ContainsKey($eventName)) { continue }
            if (-not $document['hooks'].ContainsKey($eventName)) { $document['hooks'][$eventName] = [System.Text.Json.Nodes.JsonArray]::new() }
            $document['hooks'][$eventName].Add($group.DeepClone())
        }
    } elseif ($owned.Count) {
        foreach ($eventName in $owned.Keys) {
            $groups = $document['hooks'][$eventName]
            $groups.RemoveAt($owned[$eventName])
            if ($groups.Count -eq 0 -and $eventName -cnotin $manifest.emptyEvents) { [void]$document['hooks'].Remove($eventName) }
        }
        if (-not $manifest.originallyHadHooks -and $document['hooks'].Count -eq 0) { [void]$document.Remove('hooks') }
    }

    if ($Action -eq 'Install' -or $owned.Count) {
        $backup = Join-Path $backupRoot ([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N'))
        [void][IO.Directory]::CreateDirectory($backup)
        Copy-Backup $hooksPath $backup 'hooks.json'
        Copy-Backup $configPath $backup 'config.toml'
        if (-not $existed) { [IO.File]::WriteAllText((Join-Path $backup 'hooks-was-absent.txt'), '') }
        $options = [System.Text.Json.JsonSerializerOptions]::new()
        $options.WriteIndented = $true
        $updated = if (-not $manifest.originallyExisted -and $document.Count -eq 0) { $null } else {
            $document.ToJsonString($options) + [Environment]::NewLine
        }
        Save-Hooks $raw $existed $updated
        Write-Output "Private rollback snapshot: $backup"
    }
    if ($Action -eq 'Uninstall') {
        foreach ($relative in ($files + @('node.exe', 'event.key'))) {
            $path = Join-Path $runtime $relative
            Assert-RegularPath $path
            if ([IO.File]::Exists($path)) {
                if ((Get-FileHash -LiteralPath $path).Hash -ne $manifest.hashes[$relative]) {
                    throw "Installed file was modified and has been kept: $relative"
                }
            }
        }
        foreach ($relative in ($files + @('node.exe', 'event.key', 'install.json'))) {
            [IO.File]::Delete((Join-Path $runtime $relative))
        }
        foreach ($relative in @('upstream/haloflux', 'upstream')) {
            $path = Join-Path $runtime $relative
            if ([IO.Directory]::Exists($path) -and -not [IO.Directory]::EnumerateFileSystemEntries($path).GetEnumerator().MoveNext()) {
                [IO.Directory]::Delete($path)
            }
        }
        Write-Output "HaloFlux uninstalled. Private backups retained in $backupRoot."
    } elseif ($Action -eq 'Disable') {
        Write-Output 'HaloFlux Hooks disabled. Open a new Codex chat to reload the configuration.'
    } else {
        Write-Output 'Installed. In Codex Desktop, review the eight Hooks under Settings > Hooks, then open a new chat.'
    }
} finally {
    if ($running) { $running.Dispose() }
    if ($lock) { $lock.Dispose() }
}
