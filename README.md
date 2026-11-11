# Plaanik

Lihtne eestikeelne kohalik õppeplaneerija. Python 3.10+ ja tavaline HTML, CSS ning JavaScript. Väliseid teeke ega paigaldamist pole vaja.

## Käivitamine

Ava selles kaustas terminal ja käivita:

```sh
python3 app.py
```

Ava brauseris http://127.0.0.1:8000. Serveri peatamiseks vajuta terminalis `Ctrl+C`. Kui port on hõivatud, kasuta `python3 app.py --port 8001`.

## Kasutamine

1. Vali õppeaine või lisa uus nupuga **Lisa õppeaine**. Seejärel lisa ülesanne koos tähtaja, ajakulu ja prioriteediga.
2. Määra nädalapäevade kaupa vaba õppeaeg ja vajuta **Salvesta vaba aeg**.
3. Vali soovitud nädala esmaspäev ja vajuta **Koosta õpigraafik**.
4. Märgi lõpetatud ülesanded tehtuks. Pärast muudatusi koosta graafik uuesti.

Andmed ja viimane graafik salvestatakse brauseri `localStorage`-isse. Teisel veebiaadressil või teises brauseris on eraldi salvestus. Brauseriandmete kustutamisel kaovad ka Plaaniku andmed.

## Graafiku loogika

Python seab tegemata ülesanded järjekorda varaseima tähtaja, seejärel prioriteedi järgi. See täidab valitud nädala vabad ajavahemikud kuni 90-minutiliste õppeplokkidega ning jätab iga ploki järele 15-minutilise pausi. Ajakulu sisestatakse 15 minuti täpsusega. Tähtaeg tähendab tähtpäeva lõppu. Minevikku, pärast tähtaega ega väljapoole vaba aega plokke ei lisata. Tänane aeg tuleb kasutaja brauseri kohalikust kellast.

Graafik koostatakse korraga ühele nädalale. Puuduv aeg ja möödunud tähtajad kuvatakse hoiatusena. Iga koostamine asendab eelmise graafiku. Kasutatud ahne algoritm on lihtne heuristika ega taga matemaatiliselt optimaalset jaotust. Masinõpet selles versioonis pole.

## Failid

- `app.py`: kohalik veebiserver ja graafiku koostamine.
- `static/index.html`: lehe struktuur ja vormid.
- `static/style.css`: kasutajaliidese kujundus.
- `static/app.js`: vormid, brauseri salvestus ja graafiku kuvamine.
- `tests/test_schedule.py`: graafikukoostaja kontrolltestid.

Testid:

```sh
python3 -m unittest discover -s tests -v
```
