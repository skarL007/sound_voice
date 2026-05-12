!macro customInstall
  ; Check if VB-Audio Virtual Cable is installed
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\VBCable" "DisplayName"
  ${If} $0 == ""
    DetailPrint "VB-Audio Virtual Cable not detected. Installing bundled driver..."
    ExecWait '"$INSTDIR\vbcable\VBCABLE_Setup.exe" /S'
  ${EndIf}
!macroend

!macro customUnInstall
  ; Optionally remove VB-Cable on uninstall (commented by default to be safe)
  ; ExecWait '"$INSTDIR\vbcable\VBCABLE_Setup.exe" /U /S'
!macroend
