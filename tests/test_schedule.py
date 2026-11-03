import unittest
from app import make_schedule


class ScheduleTests(unittest.TestCase):
    def setUp(self):
        self.data = {'week': '2026-10-26', 'today': '2026-10-26', 'time': '14:00',
                     'availability': [{'enabled': True, 'start': '16:00', 'end': '19:00'}] * 7,
                     'tasks': []}

    def task(self, id='a', hours=2, deadline='2026-10-28', priority='medium', **extra):
        return dict(id=id, hours=hours, deadline=deadline, priority=priority, **extra)

    def test_deadlines_priority_breaks_and_no_overlap(self):
        self.data['tasks'] = [self.task('later', deadline='2026-10-29'), self.task('low', priority='low'), self.task('high', priority='high')]
        result = make_schedule(self.data)
        sessions = result['sessions']
        self.assertEqual(sessions[0]['taskId'], 'high')
        self.assertEqual(sessions[0]['end'], '17:30')
        self.assertEqual(sessions[1]['start'], '17:45')
        self.assertEqual(sum(s['minutes'] for s in sessions), 360)
        for a, b in zip(sessions, sessions[1:]):
            if a['date'] == b['date']:
                self.assertLessEqual(a['end'], b['start'])
        for session in sessions:
            task = next(t for t in self.data['tasks'] if t['id'] == session['taskId'])
            self.assertLessEqual(session['date'], task['deadline'])

    def test_overdue_and_insufficient_capacity(self):
        self.data['tasks'] = [self.task('overdue', deadline='2026-10-25'), self.task('large', hours=10, deadline='2026-10-26')]
        result = make_schedule(self.data)
        self.assertEqual(result['unscheduled'][0]['reason'], 'overdue')
        self.assertEqual(result['unscheduled'][1]['minutes'], 435)

    def test_completed_and_past_time_not_scheduled(self):
        self.data['time'] = '18:01'
        self.data['tasks'] = [self.task('done', done=True), self.task()]
        result = make_schedule(self.data)
        self.assertEqual(result['sessions'][0]['start'], '18:15')
        self.assertFalse(any(s['taskId'] == 'done' for s in result['sessions']))

    def test_unavailable_week(self):
        self.data['availability'] = [{'enabled': False}] * 7
        self.data['tasks'] = [self.task()]
        self.assertEqual(make_schedule(self.data)['unscheduled'][0]['minutes'], 120)

    def test_invalid_inputs(self):
        for hours in (-1, 0, 0.1, 101, float('nan')):
            self.data['tasks'] = [self.task(hours=hours)]
            with self.assertRaises(ValueError):
                make_schedule(self.data)
        self.data['tasks'] = []
        self.data['availability'][0] = {'enabled': True, 'start': '19:00', 'end': '16:00'}
        with self.assertRaises(ValueError):
            make_schedule(self.data)


if __name__ == '__main__':
    unittest.main()
