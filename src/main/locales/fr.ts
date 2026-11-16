// Chaines du processus main : cle plate -> texte, interpolation {{var}}.
export const fr: Record<string, string> = {
  'edgeTts.voicesFetchFailed': 'Impossible de récupérer les voix Edge TTS : HTTP {{status}}',
  'edgeTts.emptyText': 'Le texte est vide.',
  'edgeTts.voiceNotFound': 'Voix introuvable : {{voice}}',
  'edgeTts.timeout': 'Délai dépassé pour Edge TTS (30 s)',
  'edgeTts.rejected': 'Edge TTS a refusé la requête : {{body}}',
  'edgeTts.connectionRejected': 'Edge TTS a refusé la connexion : HTTP {{status}}. Essayez de mettre à jour l’application.',
  'edgeTts.noAudio': 'Aucun audio valide reçu d’Edge TTS ({{bytes}} octets). Consultez les journaux.',
  'ipc.vbcableBundledMissing': 'Le programme d’installation fourni est introuvable. Le site officiel a été ouvert pour un téléchargement manuel.',
  'ipc.vbcableTempFolder': 'Impossible de créer le dossier temporaire : {{error}}',
  'ipc.vbcableDownloadFailed': 'Téléchargement automatique impossible. Le site officiel a été ouvert.',
  'ipc.vbcableExtractFailed': 'Téléchargé, mais l’extraction du paquet a échoué. Le site officiel a été ouvert.',
  'ipc.vbcableInstallerMissing': 'Programme d’installation introuvable dans le paquet téléchargé.',
  'ipc.vbcableLaunchFailed': 'Programme d’installation téléchargé, mais impossible de l’ouvrir ({{error}}). Lancez-le manuellement en tant qu’administrateur : {{path}}',
}
