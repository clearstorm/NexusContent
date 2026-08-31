<?php

namespace NexusContent\Companion\Tests\Integration;

require_once __DIR__ . '/IntegrationTestCase.php';

use NexusContent\Companion\Contract;
use NexusContent\Companion\Editor_Mode;

final class RestPostsIntegrationTest extends IntegrationTestCase {
	public function test_published_post_is_anonymous_by_id_and_slug_with_stable_identity(): void {
		$id = $this->factory->post->create( array( 'post_type' => 'post', 'post_status' => 'publish', 'post_name' => 'public-post', 'post_title' => 'Public post', 'post_excerpt' => 'Post excerpt', 'post_content' => '' ) );
		foreach ( array( '/nexuscontent/v1/posts/' . $id, '/nexuscontent/v1/posts/slug/public-post' ) as $route ) {
			$response = $this->request( $route );
			self::assertSame( 200, $response->get_status() );
			$post = $this->envelope( $response )['data'];
			self::assertSame( (string) $id, $post['id'] );
			self::assertSame( 'public-post', $post['key'] );
			self::assertSame( 'public-post', $post['slug'] );
			self::assertSame( 'published', $post['status'] );
			self::assertSame( 'Post excerpt', $post['excerpt'] );
			self::assertSame( array(), $post['sections'] );
			self::assertSame( array( 'editorMode' => 'gutenberg', 'content' => '' ), $post['rawFields'] );
		}
	}

	public function test_post_collection_returns_only_posts(): void {
		$post = $this->factory->post->create( array( 'post_type' => 'post', 'post_status' => 'publish', 'post_name' => 'listed-post' ) );
		$page = $this->factory->post->create( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => 'not-a-post' ) );
		$items = $this->envelope( $this->request( '/nexuscontent/v1/posts' ) )['data']['items'];
		$ids = array_column( $items, 'id' );
		self::assertContains( (string) $post, $ids );
		self::assertNotContains( (string) $page, $ids );
	}

	public function test_posts_route_rejects_pages_by_id(): void {
		$page = $this->factory->post->create( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => 'about' ) );
		$response = $this->request( '/nexuscontent/v1/posts/' . $page );
		self::assertSame( 404, $response->get_status() );
		self::assertSame( Contract::ERROR_NOT_FOUND, $response->as_error()->get_error_code() );
	}

	public function test_post_with_content_carries_rendered_body_in_raw_fields(): void {
		$id = $this->factory->post->create( array( 'post_type' => 'post', 'post_status' => 'publish', 'post_name' => 'body-post', 'post_content' => '<!-- wp:paragraph --><p>Hello body.</p><!-- /wp:paragraph -->' ) );
		$post  = $this->envelope( $this->request( '/nexuscontent/v1/posts/slug/body-post' ) )['data'];
		$field = $post['rawFields']['content'] ?? '';
		self::assertTrue( is_string( $field ) && str_contains( $field, 'Hello body.' ), 'Rendered body is missing from rawFields.' );
		// Plain paragraphs still normalize into a rich_text section.
		self::assertSame( 'rich_text', $post['sections'][0]['type'] ?? null );
	}

	public function test_post_without_structured_sections_still_carries_the_body(): void {
		$id = $this->factory->post->create( array( 'post_type' => 'post', 'post_status' => 'publish', 'post_name' => 'plain-post', 'post_excerpt' => '', 'post_content' => '<p>Body only.</p>' ) );
		update_post_meta( $id, Editor_Mode::META_KEY, Editor_Mode::ACF_FIXED );
		$post  = $this->envelope( $this->request( '/nexuscontent/v1/posts/slug/plain-post' ) )['data'];
		self::assertSame( array(), $post['sections'] );
		$field = $post['rawFields']['content'] ?? '';
		self::assertTrue( is_string( $field ) && str_contains( $field, 'Body only.' ), 'Body fallback is missing from rawFields.' );
	}
}