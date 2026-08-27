<?php

namespace NexusContent\Companion\Tests\Integration;

require_once __DIR__ . '/bootstrap.php';

use WP_REST_Request;

abstract class IntegrationTestCase extends \WP_UnitTestCase {
	protected function setUp(): void {
		parent::setUp();
		if ( ! function_exists( 'rest_get_server' ) || ! isset( $this->factory ) ) {
			$this->markTestSkipped( 'WordPress integration harness is unavailable.' );
		}
		wp_set_current_user( 0 );
		do_action( 'init' );
		do_action( 'rest_api_init' );
	}

	/** @param array<string, scalar> $params */
	protected function request( string $route, array $params = array() ) {
		$request = new WP_REST_Request( 'GET', $route );
		foreach ( $params as $key => $value ) {
			$request->set_param( $key, $value );
		}
		return rest_get_server()->dispatch( $request );
	}

	/** @return array<string, mixed> */
	protected function envelope( $response ): array {
		$data = $response->get_data();
		self::assertIsArray( $data );
		self::assertSame( 1, $data['contractVersion'] );
		return $data;
	}
}
