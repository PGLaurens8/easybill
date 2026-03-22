import unittest

from fastapi import APIRouter
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.main import REQUEST_ID_HEADER, app


class RequestTracingTests(unittest.TestCase):
    def setUp(self):
        self.router = APIRouter()

        @self.router.get('/__tests/request-id')
        def request_id_endpoint():
            return {'ok': True}

        @self.router.get('/__tests/sql-error')
        def sql_error_endpoint():
            raise SQLAlchemyError('boom')

        @self.router.get('/__tests/unhandled-error')
        def unhandled_error_endpoint():
            raise RuntimeError('boom')

        app.include_router(self.router)
        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self):
        for route in list(self.router.routes):
            if route in app.router.routes:
                app.router.routes.remove(route)
        self.client.close()

    def test_sets_request_id_header_on_success_responses(self):
        response = self.client.get('/__tests/request-id')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers[REQUEST_ID_HEADER])

    def test_preserves_incoming_request_id_header(self):
        response = self.client.get(
            '/__tests/request-id',
            headers={REQUEST_ID_HEADER: 'test-request-id'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers[REQUEST_ID_HEADER], 'test-request-id')

    def test_includes_request_id_in_sql_error_response(self):
        response = self.client.get(
            '/__tests/sql-error',
            headers={REQUEST_ID_HEADER: 'sql-request-id'},
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.headers[REQUEST_ID_HEADER], 'sql-request-id')
        self.assertEqual(response.json()['request_id'], 'sql-request-id')
        self.assertEqual(response.json()['detail'], 'Database request failed')

    def test_includes_request_id_in_unhandled_error_response(self):
        response = self.client.get(
            '/__tests/unhandled-error',
            headers={REQUEST_ID_HEADER: 'runtime-request-id'},
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.headers[REQUEST_ID_HEADER], 'runtime-request-id')
        self.assertEqual(response.json()['request_id'], 'runtime-request-id')
        self.assertEqual(response.json()['detail'], 'Internal server error')


if __name__ == '__main__':
    unittest.main()
