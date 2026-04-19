---
title: '1. Úvod'
description: 'Průvodce aplikací ČÁP — od prvního přihlášení přes import dat z IS KOS a editaci komisí až po exporty časového plánu.'
---

### 1.1 Účel aplikace

Aplikace ČÁP představuje webový nástroj určený pro podporu přípravy časových plánů státních závěrečných
zkoušek (dále jen „SZZ“) na Fakultě informačních technologií ČVUT v Praze. Jejím hlavním účelem je usnadnit referentce
pro SZZ výkon rutinních činností souvisejících se sestavováním harmonogramu, zejména:

- správu studentů, přestávek a dozoru u jednotlivých komisí,
- výpočet časů písemné přípravy i ústní zkoušky,
- generování výstupních dokumentů určených jak ke zveřejnění, tak pro interní potřeby fakulty.

Mezi tyto výstupy patří například podklady pro dozor u písemné přípravy, formuláře s otázkami ke SZZ, štítky na obálky,
do nichž jsou tyto formuláře následně vkládány, a rovněž samotný plán konání státních závěrečných zkoušek určený ke
zveřejnění.

Předpokladem pro využití aplikace je dostupnost odpovídajících exportů z informačního systému KOS (dále jen „IS KOS“),
které jsou pro potřeby dalšího zpracování v aplikaci předem připraveny. Tyto exporty již obsahují studenty rozřazené do
jednotlivých komisí. Aplikace nepokrývá problematiku sestavování členů komisí ani prvotního přiřazování studentů k
jednotlivým komisím. Zaměřuje se především na podporu výše popsaných činností, které lze spolehlivě automatizovat,
vhodně podpořit prostřednictvím uživatelského rozhraní a tím snížit pravděpodobnost vzniku chyb při přípravě časového
plánu.

Aplikace zároveň umožňuje plnohodnotnou manipulaci s jednotlivými datovými entitami, zejména jejich vytváření, úpravu a
odstraňování. Jedná se především o časový plán, komise, studenty a závěrečné práce.

### 1.2 Pro koho je dokument určen

Tato příručka je primárně určena cílovým uživatelům aplikace, tedy zejména referentce pro SZZ nebo jiné osobě odpovědné
za sestavení harmonogramu.

Dokument nezahrnuje informace o nasazení, konfiguraci ani o dalším rozvoji aplikace. Tyto informace jsou uvedeny v
samostatné technické dokumentaci dostupné v repozitáři projektu.

### 1.3 Přístup k aplikaci

Aplikace je nasazena na adrese [https://cap.ksi.fit.cvut.cz](https://cap.ksi.fit.cvut.cz).
Přístup k ní je z bezpečnostních důvodů omezen pouze na uživatele, kteří současně splňují následující podmínky:

1. jsou připojeni prostřednictvím **fakultní VPN**; pokud se uživatel nachází v prostorách fakulty a je připojen k
   fakultní síti, je připojení k VPN zajištěno automaticky a není nutná žádná další konfigurace zařízení,
2. byli správcem aplikace zařazeni na **seznam oprávněných osob**.

Pokud o přístup teprve žádáte nebo potřebujete jinou součinnost ze strany správy aplikace, kontaktujte primárního
správce aplikace, [Ing. Jana Blizničenka, Ph.D.](https://usermap.cvut.cz/profile/030461bf-8031-4307-baa4-46a89b05bbdc).

![Úvodní obrazovka s tlačítkem přihlášení přes FIT Auth](/user-manual/introduction.png)
