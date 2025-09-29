---
name: Bug report
about: Create a report to help us improve
title: ''
labels: ''
assignees: ''

---

name: Bug report
description: Segnala un problema o malfunzionamento
title: "[BUG] "
labels: ["type:bug", "status:needs-info"]
body:
  - type: textarea
    id: steps
    attributes:
      label: Passi per riprodurre
      description: Elenca i passaggi per generare il problema
      placeholder: "1) ...\n2) ...\n3) ..."
    validations: { required: true }
  - type: textarea
    id: actual
    attributes:
      label: Comportamento attuale
      placeholder: "Es. errore 500, schermata bianca, log…"
    validations: { required: true }
  - type: textarea
    id: expected
    attributes:
      label: Comportamento atteso
      placeholder: "Cosa ti aspettavi che accadesse?"
    validations: { required: true }
  - type: dropdown
    id: severity
    attributes:
      label: Severità
      options: ["critica", "alta", "media", "bassa"]
    validations: { required: true }
  - type: input
    id: env
    attributes:
      label: Ambiente
      placeholder: "Versione app, OS/Browser, endpoint, DB, ecc."
  - type: textarea
    id: evidence
    attributes:
      label: Evidenze
      description: Log/screenshot o link utili
  - type: checkboxes
    id: acceptance
    attributes:
      label: Criteri di accettazione
      options:
        - label: Riproducibile e casi coperti da test (se applicabile)
        - label: Fix verificato in staging
        - label: Note di rilascio aggiornate (se necessario)
