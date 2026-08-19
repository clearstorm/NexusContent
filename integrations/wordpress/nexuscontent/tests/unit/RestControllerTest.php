<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Capabilities;
use NexusContent\Companion\Contract;
use NexusContent\Companion\Editor_Mode;
use NexusContent\Companion\Media_Normalizer;
use NexusContent\Companion\Normalizer;
use NexusContent\Companion\REST_Controller;
use NexusContent\Companion\Section_Registry;
use NexusContent\Companion\Tests\TestCase;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class RestControllerTest extends TestCase {
	private function controller(): REST_Controller {
		$registry     = new Section_Registry();
		$capabilities = new Capabilities( $registry );
		return new REST_Controller( new Contract(), new Normalizer( new Editor_Mode( $capabilities ), $registry, new Media_Normalizer() ), $registry, $capabilities );
	}

	public function test_routes_register_expected_public_and_content_endpoints(): void {
		$this->controller()->register_routes();
		self::assertSame(
			array( 'nexuscontent/v1/pages', 'nexuscontent/v1/pages/(?P<id>\d+)', 'nexuscontent/v1/pages/slug/(?P<slug>[^/]+)', 'nexuscontent/v1/schema', 'nexuscontent/v1/capabilities' ),
			array_keys( $GLOBALS['nc_test']['routes'] )
		);
	}

	public function test_schema_and_capabilities_are_valid_contract_envelopes(): void {
		$controller = $this->controller();
		foreach ( array( 'schema' => $controller->get_schema(), 'capabilities' => $controller->get_capabilities() ) as $shape => $response ) {
			self::assertInstanceOf( WP_REST_Response::class, $response );
			self::assertTrue( ( new Contract() )->validate( $response->get_data(), $shape ) );
		}
		self::assertCount( 12, $controller->get_schema()->get_data()['data']['sectionDefinitions'] );
	}

	public function test_published_unprotected_page_is_public_but_draft_and_password_pages_require_edit_access(): void {
		$controller = $this->controller();
		foreach ( array(
			'published' => $this->post( array( 'ID' => 1, 'post_status' => 'publish' ) ),
			'draft' => $this->post( array( 'ID' => 2, 'post_status' => 'draft' ) ),
			'password' => $this->post( array( 'ID' => 3, 'post_status' => 'publish', 'post_password' => 'secret' ) ),
		) as $kind => $post ) {
			$request = new WP_REST_Request();
			$request['id'] = $post->ID;
			$result = $controller->page_permissions_check( $request );
			if ( 'published' === $kind ) {
				self::assertTrue( $result );
			} else {
				self::assertInstanceOf( WP_Error::class, $result );
				self::assertSame( Contract::ERROR_FORBIDDEN, $result->get_error_code() );
			}
		}
		$GLOBALS['nc_test']['caps']['edit_post'] = true;
		$request['id'] = 2;
		self::assertTrue( $controller->page_permissions_check( $request ) );
	}

	public function test_non_publish_collection_status_requires_editor_permission(): void {
		$request = new WP_REST_Request();
		$request->set_param( 'status', 'draft' );
		$result = $this->controller()->pages_permissions_check( $request );
		self::assertInstanceOf( WP_Error::class, $result );
		$GLOBALS['nc_test']['caps']['edit_pages'] = true;
		self::assertTrue( $this->controller()->pages_permissions_check( $request ) );
	}
}
