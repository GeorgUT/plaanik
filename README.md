# Plaanik

Lihtne eestikeelne kohalik õppeplaneerija. Python 3.10+ ja tavaline HTML, CSS ning JavaScript. Väliseid teeke ega paigaldamist pole vaja.

## Käivitamine

Ava selles kaustas terminal ja käivita:

```sh
python3 app.py
```

Ava brauseris http://127.0.0.1:8000 (nädalakalendriga kujundus). Algne lihtne versioon asub aadressil http://127.0.0.1:8000/simple/. Serveri peatamiseks vajuta terminalis `Ctrl+C`. Kui port on hõivatud, kasuta `python3 app.py --port 8001`.

## Kasutamine

1. Lisa vasakult õppeaine ja nupuga **Lisa ülesanne** ülesanne koos tähtaja, ajakulu ja prioriteediga.
2. Nupuga **Muuda vaba aega** määra nädalapäevade kaupa vaba õppeaeg.
3. Vali nooltega sobiv nädal ja vajuta **Koosta õpigraafik**.
4. Märgi lõpetatud ülesanded tehtuks. Pärast muudatusi koosta graafik uuesti.

Nädalakalendriga versioon avab esimesel korral neli selgelt märgitud näidisülesannet ja näidisgraafiku. Need saad eemaldada vasakult nupuga **Eemalda**. Näidisgraafik tutvustab kujundust; **Koosta õpigraafik** asendab selle Pythoni arvutatud tulemusega. Ülesande muutmiseks klõpsa selle pealkirjal, kalendriplokil või kolmel punktil. Kustutamist saab kümne sekundi jooksul tagasi võtta. Lihtne versioon alustab ülesanneteta. Kahe versiooni brauserisalvestused on eraldi, et saaksid neid kõrvuti proovida. Andmed ja viimane graafik salvestatakse selle brauseri `localStorage`-isse. Teise brauseri või aadressi kasutamisel on salvestus eraldi; brauseriandmete kustutamisel andmed kaovad.

## Graafiku loogika

Python seab tegemata ülesanded järjekorda varaseima tähtaja, seejärel prioriteedi järgi. See täidab valitud nädala vabad ajavahemikud kuni 90-minutiliste õppeplokkidega ning jätab iga ploki järele 15-minutilise pausi. Ajakulu sisestatakse 15 minuti täpsusega. Tähtaeg tähendab tähtpäeva lõppu. Minevikku, pärast tähtaega ega väljapoole vaba aega plokke ei lisata. Tänane aeg tuleb kasutaja brauseri kohalikust kellast.

Graafik koostatakse korraga ühele nädalale. Puuduv aeg ja möödunud tähtajad kuvatakse hoiatusena. Iga koostamine asendab eelmise graafiku. Kasutatud ahne algoritm on lihtne heuristika ega taga matemaatiliselt optimaalset jaotust. Masinõpet selles versioonis pole.

## Failid

- `app.py`: kohalik veebiserver ja graafiku koostamine.
- `static/index.html`: lehe struktuur ja vormid.
- `static/style.css`: nädalakalendri kujundus.
- `static/dashboard.js`: vormid, brauseri salvestus ja kalendri kuvamine.
- `static/planner.js`: andmemudel, kuupäevad ja näidisandmed.
- `static/icons.js`: liidese SVG-ikoonid.
- `static/simple/`: algne lihtne HTML/CSS/JavaScript versioon.
- `tests/test_schedule.py`: graafikukoostaja kontrolltestid.

Testid:

```sh
python3 -m unittest discover -s tests -v
```
