param(
 [Parameter(Mandatory=$true)][string]$ToolRoot,
 [Parameter(Mandatory=$true)][string]$Backend,
 [string]$Client,
 [string]$Assessment,
 [string[]]$EditorRoot,
 [switch]$ApplyGenerated
)
$ErrorActionPreference='Stop'
if($ApplyGenerated -and ($Assessment -or $EditorRoot)){throw 'Planeje a avaliacao/editores antes de ApplyGenerated; a aplicacao nao regenera o snapshot.'}
$verifyArgs=@((Join-Path $ToolRoot 'verify.mjs'),'--from',$PSScriptRoot)
if($Client){$verifyArgs+=@('--client',$Client)}
& node @verifyArgs
if($LASTEXITCODE -ne 0){throw 'Evidence verification failed'}
$planArgs=@((Join-Path $ToolRoot 'prepare.mjs'),'--from',$PSScriptRoot,'--backend',$Backend)
if($Client){$planArgs+=@('--client',$Client)}
if($Assessment){$planArgs+=@('--assessment',$Assessment)}
if($EditorRoot){foreach($root in $EditorRoot){$planArgs+=@('--editor-root',$root)}}
if(-not $ApplyGenerated){ & node @planArgs }
if(-not $ApplyGenerated -and $LASTEXITCODE -ne 0){throw 'Arena preparation failed'}
$installArgs=@((Join-Path $ToolRoot 'integrate.mjs'),'--from',$PSScriptRoot,'--backend',$Backend)
if($ApplyGenerated){$installArgs+='--apply'}
& node @installArgs
if($LASTEXITCODE -ne 0){throw 'Generated class integration failed'}
Write-Output 'Abra COMECE_AQUI.md e as quatro tarefas. Os servicos ainda precisam ser conectados; nenhum deploy foi executado.'
