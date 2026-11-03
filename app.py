"""Plaaniku kohalik veebiserver. Vajab ainult Python 3.10+ standardteeki."""
import argparse
import json
from datetime import date, datetime, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def minutes(value):
    parsed = datetime.strptime(value, '%H:%M')
    return parsed.hour * 60 + parsed.minute


def clock(value):
    return f'{value // 60:02d}:{value % 60:02d}'


def make_schedule(data):
    """Täida vaba aeg varaseima tähtaja, siis prioriteedi järgi, kuni 90 min kaupa.

    Tegemist on läbipaistva heuristikaga, mitte matemaatilise optimaalsuse garantiiga.
    Iga ploki järel jäetakse 15 min puhkuseks. Tähtpäev loetakse päeva lõpuni.
    """
    start = date.fromisoformat(data['week'])
    today = date.fromisoformat(data['today'])
    now_minute = minutes(data['time'])
    availability = data['availability']
    if not isinstance(availability, list) or len(availability) != 7:
        raise ValueError('Määra vaba aeg kõigile seitsmele nädalapäevale.')
    slots = []
    for i, entry in enumerate(availability):
        if not entry.get('enabled'):
            continue
        a, b = minutes(entry['start']), minutes(entry['end'])
        if a >= b:
            raise ValueError('Vaba aja lõpp peab olema algusest hilisem.')
        day = start + timedelta(days=i)
        if day < today:
            continue
        if day == today:
            a = max(a, ((now_minute + 14) // 15) * 15)
        if a < b:
            slots.append({'date': day.isoformat(), 'cursor': a, 'end': b})

    tasks = data['tasks']
    if not isinstance(tasks, list) or len(tasks) > 500:
        raise ValueError('Ülesandeid võib olla kuni 500.')
    pending = []
    for task in tasks:
        if task.get('done'):
            continue
        duration = float(task['hours']) * 60
        if not duration.is_integer() or duration < 15 or duration > 6000 or duration % 15:
            raise ValueError('Ajakulu peab olema 0,25–100 tundi, 15 minuti täpsusega.')
        deadline = date.fromisoformat(task['deadline'])
        priority = task['priority']
        if priority not in ('high', 'medium', 'low'):
            raise ValueError('Tundmatu prioriteet.')
        if not isinstance(task['id'], str) or not task['id']:
            raise ValueError('Ülesande ID puudub.')
        pending.append((deadline, {'high': 0, 'medium': 1, 'low': 2}[priority], task, int(duration)))
    pending.sort(key=lambda item: (item[0], item[1], item[2]['id']))
    sessions, unscheduled = [], []
    for deadline, _, task, remaining in pending:
        for slot in slots:
            if slot['date'] > deadline.isoformat():
                break
            while remaining and slot['end'] - slot['cursor'] >= 15:
                duration = min(90, remaining, slot['end'] - slot['cursor'])
                duration = duration // 15 * 15
                sessions.append({'taskId': task['id'], 'date': slot['date'],
                                 'start': clock(slot['cursor']),
                                 'end': clock(slot['cursor'] + duration), 'minutes': duration})
                slot['cursor'] += duration + 15
                remaining -= duration
            if not remaining:
                break
        if remaining:
            unscheduled.append({'taskId': task['id'], 'minutes': remaining,
                                'reason': 'overdue' if deadline < today else 'capacity'})
    return {'sessions': sessions, 'unscheduled': unscheduled}


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] == '/':
            self.path = '/index.html'
        super().do_GET()

    def do_POST(self):
        if self.path != '/api/schedule':
            self.send_error(404)
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size <= 0 or size > 1_000_000:
                raise ValueError('Päringu maht ei sobi.')
            result = make_schedule(json.loads(self.rfile.read(size)))
            self.respond(200, result)
        except (ValueError, KeyError, TypeError, AttributeError, OverflowError) as error:
            self.respond(400, {'error': str(error) or 'Kontrolli sisestatud andmeid.'})

    def respond(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Plaaniku kohalik veebiserver')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(ROOT / 'static')))
    print(f'Plaanik töötab: http://127.0.0.1:{args.port} (sulgemiseks Ctrl+C)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
