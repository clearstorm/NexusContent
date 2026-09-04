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
use NexusContent\Companion\Seo_Fields;
use NexusContent\Companion\Tests\TestCase;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class RestControllerTest extends TestCase {
	private function controller(): REST_Controller {
		$registry     = new Section_Registry();
		$capabilities = new Capabilities( $registry );
		return new REST_Controller( new Contract(), new Normalizer( new Editor_Mode( $capabilities ), $registry, new Media_Normalizer(), new Seo_Fields() ), $registry, $capabilities );
	}

	public function test_routes_register_expected_public_and_content_endpoints(): void {
		$this->controller()->register_routes();
		self::assertSame(
			array( 'nexuscontent/v1/pages', 'nexuscontent/v1/pages/(?P<id>\d+)', 'nexuscontent/v1/pages/slug/(?P<slug>[^/]+)', 'nexuscontent/v1/posts', 'nexuscontent/v1/posts/(?P<id>\d+)', 'nexuscontent/v1/posts/slug/(?P<slug>[^/]+)', 'nexuscontent/v1/schema', 'nexuscontent/v1/capabilities', 'nexuscontent/v1/settings', 'nexuscontent/v1/project-contract', 'nexuscontent/v1/preview-token', 'nexuscontent/v1/preview/(?P<token>[0-9a-f]+)/(?P<id>\d+)' ),
			array_keys( $GLOBALS['nc_test']['routes'] )
		);
	}

	public function test_project_contract_permissions_check_requires_manage_options(): void {
		$request = new WP_REST_Request();
		$request['components']   = array( 'hero' );
		$request['sectionTypes'] = array( 'hero' );

		$GLOBALS['nc_test']['caps']['manage_options'] = false;
		self::assertInstanceOf( WP_Error::class, $this->controller()->project_contract_permissions_check( $request ) );

		$GLOBALS['nc_test']['caps']['manage_options'] = true;
		self::assertTrue( $this->controller()->project_contract_permissions_check( $request ) );
	}

	public function test_project_contract_route_stores_sanitized_contract(): void {
		$controller = $this->controller();
		$GLOBALS['nc_test']['caps']['manage_options'] = true;
		$GLOBALS['nc_test']['options']['nexuscontent_settings'] = array( 'enabled_sections' => array( 'hero' ) );

		$request = new WP_REST_Request();
		$request['components']   = array( 'hero', 'cta', 'hero' );
		$request['sectionTypes'] = array( 'cta', 'hero' );

		$response = $controller->set_project_contract( $request );
		self::assertInstanceOf( WP_REST_Response::class, $response );
		self::assertSame(
			array(
				'components'   => array( 'cta', 'hero' ),
				'sectionTypes' => array( 'cta', 'hero' ),
			),
			$response->get_data()
		);
		$stored = $GLOBALS['nc_test']['options']['nexuscontent_settings'];
		self::assertSame( array( 'cta', 'hero' ), $stored['project_components']['sectionTypes'] );
		self::assertSame( array( 'enabled_sections' => array( 'hero' ) ), array_intersect_key( $stored, array( 'enabled_sections' => true ) ) );
	}

	public function test_project_contract_rejects_non_array_payloads(): void {
		$controller = $this->controller();
		$GLOBALS['nc_test']['caps']['manage_options'] = true;

		$request = new WP_REST_Request();
		$request['components']   = 'hero';
		$request['sectionTypes'] = array( 'hero' );

		$result = $controller->set_project_contract( $request );
		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( 400, $result->get_error_data()['status'] );
	}

	public function test_schema_and_capabilities_are_valid_contract_envelopes(): void {
		$controller = $this->controller();
		foreach ( array( 'schema' => $controller->get_schema(), 'capabilities' => $controller->get_capabilities() ) as $shape => $response ) {
			self::assertInstanceOf( WP_REST_Response::class, $response );
			self::assertTrue( ( new Contract() )->validate( $response->get_data(), $shape ) );
		}
		self::assertCount( 12, $controller->get_schema()->get_data()['data']['sectionDefinitions'] );
	}

	public function test_settings_are_returned_in_a_valid_public_contract_envelope(): void {
		$GLOBALS['nc_test']['options']['admin_email'] = 'admin@example.test';
		$GLOBALS['nc_test']['fields']['option']['nexus_site_name'] = 'Companion site';
		$response = $this->controller()->get_settings();
		self::assertInstanceOf( WP_REST_Response::class, $response );
		self::assertTrue( ( new Contract() )->validate( $response->get_data(), 'settings' ) );
		self::assertSame( 'Companion site', $response->get_data()['data']['name'] );
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

	public function test_posts_route_collection_targets_post_type(): void {
		$controller = $this->controller();
		$request = new WP_REST_Request( 'GET', '/nexuscontent/v1/posts' );
		$GLOBALS['nc_test']['query_posts'] = array( $this->post( array( 'ID' => 10, 'post_type' => 'post', 'post_name' => 'hello', 'post_title' => 'Hello' ) ) );

		$response = $controller->get_pages( $request );

		self::assertInstanceOf( WP_REST_Response::class, $response );
		self::assertSame( 'post', $GLOBALS['nc_test']['query_args'][0]['post_type'] );
		self::assertCount( 1, $response->get_data()['data']['items'] );
		self::assertSame( 'hello', $response->get_data()['data']['items'][0]['key'] );
	}

	public function test_posts_route_slug_returns_only_posts(): void {
		$controller = $this->controller();
		$GLOBALS['nc_test']['posts'] = array( 20 => $this->post( array( 'ID' => 20, 'post_type' => 'post', 'post_name' => 'welcome', 'post_title' => 'Welcome' ) ) );
		$request = new WP_REST_Request( 'GET', '/nexuscontent/v1/posts/slug/welcome' );
		$request['slug'] = 'welcome';

		$response = $controller->get_page_by_slug( $request );

		self::assertInstanceOf( WP_REST_Response::class, $response );
		self::assertSame( 'Welcome', $response->get_data()['data']['title'] );
	}

	public function test_posts_route_rejects_page_ids(): void {
		$controller = $this->controller();
		$GLOBALS['nc_test']['posts'] = array( 30 => $this->post( array( 'ID' => 30, 'post_type' => 'page', 'post_name' => 'about', 'post_status' => 'publish' ) ) );
		$request = new WP_REST_Request( 'GET', '/nexuscontent/v1/posts/(?P<id>\d+)' );
		$request['id'] = 30;

		$result = $controller->get_page( $request );

		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( Contract::ERROR_NOT_FOUND, $result->get_error_code() );
	}

	public function test_posts_collection_private_status_uses_posts_capability(): void {
		$request = new WP_REST_Request( 'GET', '/nexuscontent/v1/posts' );
		$request->set_param( 'status', 'private' );
		$GLOBALS['nc_test']['caps']['read_private_posts'] = true;
		self::assertTrue( $this->controller()->pages_permissions_check( $request ) );
	}

	public function test_preview_token_permission_requires_edit_posts(): void {
		$controller = $this->controller();
		$GLOBALS['nc_test']['caps']['edit_posts'] = false;
		self::assertInstanceOf( WP_Error::class, $controller->preview_token_permissions_check() );
		$GLOBALS['nc_test']['caps']['edit_posts'] = true;
		self::assertTrue( $controller->preview_token_permissions_check() );
	}

	public function test_create_preview_token_mints_scoped_token(): void {
		$controller = $this->controller();
		$post       = $this->post( array( 'ID' => 7, 'post_type' => 'page', 'post_name' => 'draft-page', 'post_title' => 'Draft page', 'post_status' => 'draft' ) );
		$GLOBALS['nc_test']['caps']['edit_post']  = true;
		$GLOBALS['nc_test']['options']['nexuscontent_settings'] = array( 'preview_frontend_url' => 'https://example.test' );

		$request = new WP_REST_Request( 'POST', '/nexuscontent/v1/preview-token' );
		$request->set_param( 'postId', $post->ID );

		$response = $controller->create_preview_token( $request );
		self::assertInstanceOf( WP_REST_Response::class, $response );

		$data = $response->get_data()['data'];
		self::assertMatchesRegularExpression( '/^[0-9a-f]{64}$/', $data['token'] );
		self::assertIsString( $data['expiresAt'] );
		self::assertStringContainsString( 'preview?token=' . $data['token'] . '&id=7', $data['previewUrl'] );
	}

	public function test_create_preview_token_rejects_missing_post(): void {
		$controller = $this->controller();
		$GLOBALS['nc_test']['caps']['edit_post'] = true;

		$request = new WP_REST_Request( 'POST', '/nexuscontent/v1/preview-token' );
		$request->set_param( 'postId', 999 );

		$result = $controller->create_preview_token( $request );
		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( Contract::ERROR_NOT_FOUND, $result->get_error_code() );
	}

	public function test_create_preview_token_rejects_without_edit_capability(): void {
		$controller = $this->controller();
		$this->post( array( 'ID' => 8, 'post_type' => 'page' ) );

		$request = new WP_REST_Request( 'POST', '/nexuscontent/v1/preview-token' );
		$request->set_param( 'postId', 8 );

		$result = $controller->create_preview_token( $request );
		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( Contract::ERROR_FORBIDDEN, $result->get_error_code() );
	}

	public function test_get_preview_returns_normalized_content_for_valid_token(): void {
		$controller = $this->controller();
		$this->post( array( 'ID' => 5, 'post_type' => 'page', 'post_name' => 'preview-page', 'post_title' => 'Preview page', 'post_status' => 'draft' ) );

		$token = \NexusContent\Companion\Preview_Token::mint( 5 );
		$request = new WP_REST_Request( 'GET', '/nexuscontent/v1/preview/{token}/{id}' );
		$request->set_param( 'token', $token['token'] );
		$request->set_param( 'id', 5 );

		$response = $controller->get_preview( $request );
		self::assertInstanceOf( WP_REST_Response::class, $response );
		self::assertSame( 'Preview page', $response->get_data()['data']['title'] );
		self::assertSame( 'draft', $response->get_data()['data']['status'] );
	}

	public function test_get_preview_rejects_invalid_token(): void {
		$controller = $this->controller();
		$this->post( array( 'ID' => 6, 'post_type' => 'page' ) );

		$request = new WP_REST_Request( 'GET', '/nexuscontent/v1/preview/{token}/{id}' );
		$request->set_param( 'token', str_repeat( 'a', 64 ) );
		$request->set_param( 'id', 6 );

		$result = $controller->get_preview( $request );
		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( Contract::ERROR_INVALID_PREVIEW_TOKEN, $result->get_error_code() );
	}

	public function test_get_preview_rejects_token_bound_to_different_post(): void {
		$controller = $this->controller();
		$this->post( array( 'ID' => 9, 'post_type' => 'page' ) );
		$this->post( array( 'ID' => 10, 'post_type' => 'page' ) );

		$token = \NexusContent\Companion\Preview_Token::mint( 9 );
		$request = new WP_REST_Request( 'GET', '/nexuscontent/v1/preview/{token}/{id}' );
		$request->set_param( 'token', $token['token'] );
		$request->set_param( 'id', 10 );

		$result = $controller->get_preview( $request );
		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( Contract::ERROR_INVALID_PREVIEW_TOKEN, $result->get_error_code() );
		self::assertNull( \NexusContent\Companion\Preview_Token::validate( $token['token'] ) );
	}
}
