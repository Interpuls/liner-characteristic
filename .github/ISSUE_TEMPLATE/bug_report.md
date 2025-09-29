---
name: Bug report
about: Create a report to help us improve
title: ''
labels: ''
assignees: ''

---

name: Bug report
description: Segnala un problema
labels: ["type:bug"]
body:
  - type: textarea
    id: steps
    attributes:
      label: Passi per riprodurre
    validations: { required: true }
  - type: textarea
    id: expected
    attributes:
      label: Comportamento atteso
