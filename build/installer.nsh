!macro customInstall
  ; O microfone virtual (VB-Audio Virtual Cable) vem embutido no app
  ; (assets/vbcable -> resources/vbcable). O instalador do app roda elevado
  ; (requireAdministrator), entao instalamos o driver aqui, em silencio, se ele
  ; ainda nao estiver presente. Assim o launcher nao precisa baixar/instalar nada.
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\VBCABLE" "DisplayName"
  ${If} $0 == ""
    ${If} ${FileExists} "$INSTDIR\resources\vbcable\VBCABLE_Setup_x64.exe"
      DetailPrint "Installing virtual microphone (VB-Audio Virtual Cable)..."
      ExecWait '"$INSTDIR\resources\vbcable\VBCABLE_Setup_x64.exe" /S'
    ${ElseIf} ${FileExists} "$INSTDIR\resources\vbcable\VBCABLE_Setup.exe"
      DetailPrint "Installing virtual microphone (VB-Audio Virtual Cable)..."
      ExecWait '"$INSTDIR\resources\vbcable\VBCABLE_Setup.exe" /S'
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstall
  ; Por seguranca, NAO removemos o VB-Cable na desinstalacao (outros apps podem usar).
!macroend
