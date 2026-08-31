<?php

namespace NexusContent\Companion\Tests\Integration;

require_once __DIR__ . '/IntegrationTestCase.php';

use NexusContent\Companion\Contract;
use NexusContent\Companion\Preview_Token;
use WP_REST_Request;

final class RestPreviewIntegrationTest extends IntegrationTestCase {
	/** @param array<string, scalar> $params */
	private function post_request( string $route, array $params = array() ) {
		$request = new WP_REST_Request( 'POST', $route );
		foreach ( $params as $key => $value ) {
			$request->set_param( $key, $value );
		}
		return rest_get_server()->dispatch( $request );
	}

	public function test_preview_token_minting_requires_edit_posts_and_binds_to_post(): void {
		$editor = $this->factory->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( 0 );
		$id = $this->factory->post->create( array( 'post_type' => 'post', 'post_status' => 'draft', 'post_name' => 'draft-post' ) );

		// Anonymous cannot mint.
		$response = $this->post_request( '/nexuscontent/v1/preview-token', array( 'postId' => $id ) );
		self::assertSame( 401, $response->get_status() );

		// Editor can mint.
		wp_set_current_user( $editor );
		$response = $this->post_request( '/nexuscontent/v1/preview-token', array( 'postId' => $id ) );
		self::assertSame( 200, $response->get_status() );
		$data = $this->envelope( $response )['data'];
		self::assertMatchesRegularExpression( '/^[0-9a-f]{64}$/', $data['token'] );
		self::assertIsString( $data['expiresAt'] );
	}

	public function test_preview_serves_draft_content_anonymously_via_token(): void {
		$editor = $this->factory->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$id = $this->factory->post->create( array( 'post_type' => 'post', 'post_status' => 'draft', 'post_name' => 'draft-post', 'post_title' => 'Draft post' ) );
		$token = Preview_Token::mint( $id )['token'];
		wp_set_current_user( 0 );

		$response = $this->request( '/nexuscontent/v1/preview/' . $token . '/' . $id );
		self::assertSame( 200, $response->get_status() );
		$post = $this->envelope( $response )['data'];
		self::assertSame( (string) $id, $post['id'] );
		self::assertSame( 'Draft post', $post['title'] );
		self::assertSame( 'draft', $post['status'] );
	}

	public function test_preview_rejects_invalid_and_mismatched_tokens(): void {
		$editor = $this->factory->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$id   = $this->factory->post->create( array( 'post_type' => 'post', 'post_status' => 'draft' ) );
		$id2  = $this->factory->post->create( array( 'post_type' => 'post', 'post_status' => 'draft' ) );
		$token = Preview_Token::mint( $id )['token'];
		wp_set_current_user( 0 );

		self::assertSame( 401, $this->request( '/nexuscontent/v1/preview/' . str_repeat( 'a', 64 ) . '/' . $id )->get_status() );
		self::assertSame( 401, $this->request( '/nexuscontent/v1/preview/' . $token . '/' . $id2 )->get_status() );
	}
}
