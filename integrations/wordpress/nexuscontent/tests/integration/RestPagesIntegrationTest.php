<?php

namespace NexusContent\Companion\Tests\Integration;

require_once __DIR__ . '/IntegrationTestCase.php';

use NexusContent\Companion\Contract;
use NexusContent\Companion\Editor_Mode;

final class RestPagesIntegrationTest extends IntegrationTestCase {
	public function test_published_page_is_anonymous_by_id_and_slug_with_stable_identity(): void {
		$id = $this->factory->post->create( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => 'public-page', 'post_title' => 'Public page' ) );
		foreach ( array( '/nexuscontent/v1/pages/' . $id, '/nexuscontent/v1/pages/slug/public-page' ) as $route ) {
			$response = $this->request( $route );
			self::assertSame( 200, $response->get_status() );
			$page = $this->envelope( $response )['data'];
			self::assertSame( (string) $id, $page['id'] );
			self::assertSame( 'public-page', $page['key'] );
			self::assertSame( 'public-page', $page['slug'] );
			self::assertSame( 'published', $page['status'] );
		}
	}

	public function test_draft_requires_edit_permission_and_is_available_to_an_editor(): void {
		$id = $this->factory->post->create( array( 'post_type' => 'page', 'post_status' => 'draft', 'post_name' => 'draft-page' ) );
		self::assertSame( 401, $this->request( '/nexuscontent/v1/pages/' . $id )->get_status() );
		$editor = $this->factory->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$response = $this->request( '/nexuscontent/v1/pages/' . $id );
		self::assertSame( 200, $response->get_status() );
		self::assertSame( 'draft', $this->envelope( $response )['data']['status'] );
	}

	public function test_password_page_is_not_public_and_is_excluded_from_anonymous_collection(): void {
		$id = $this->factory->post->create( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_password' => 'secret', 'post_name' => 'protected-page' ) );
		self::assertSame( 401, $this->request( '/nexuscontent/v1/pages/' . $id )->get_status() );
		$items = $this->envelope( $this->request( '/nexuscontent/v1/pages' ) )['data']['items'];
		self::assertNotContains( (string) $id, array_column( $items, 'id' ) );
	}

	public function test_empty_page_returns_valid_empty_sections(): void {
		$id = $this->factory->post->create( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => '', 'post_excerpt' => '' ) );
		$page = $this->envelope( $this->request( '/nexuscontent/v1/pages/' . $id ) )['data'];
		self::assertSame( array(), $page['sections'] );
		self::assertSame( array( 'editorMode' => 'gutenberg', 'content' => '' ), $page['rawFields'] );
	}

	public function test_collection_paginates_and_emits_consistent_headers(): void {
		foreach ( range( 1, 5 ) as $number ) {
			$this->factory->post->create( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Page ' . $number ) );
		}
		$response = $this->request( '/nexuscontent/v1/pages', array( 'page' => 2, 'per_page' => 2, 'order' => 'asc', 'orderby' => 'id' ) );
		self::assertSame( 200, $response->get_status() );
		$data = $this->envelope( $response )['data'];
		self::assertCount( 2, $data['items'] );
		self::assertSame( 2, $data['pagination']['page'] );
		self::assertSame( 2, $data['pagination']['perPage'] );
		self::assertSame( (string) $data['pagination']['total'], $response->get_headers()['X-WP-Total'] );
		self::assertSame( (string) $data['pagination']['totalPages'], $response->get_headers()['X-WP-TotalPages'] );
	}

	public function test_invalid_collection_and_item_arguments_return_rest_errors(): void {
		foreach ( array(
			array( '/nexuscontent/v1/pages', array( 'page' => 0 ) ),
			array( '/nexuscontent/v1/pages', array( 'per_page' => 101 ) ),
			array( '/nexuscontent/v1/pages', array( 'status' => 'deleted' ) ),
			array( '/nexuscontent/v1/pages', array( 'order' => 'sideways' ) ),
			array( '/nexuscontent/v1/pages/0', array() ),
		) as list( $route, $params ) ) {
			self::assertSame( 400, $this->request( $route, $params )->get_status(), $route . ' should reject invalid arguments' );
		}
	}

	public function test_conflicting_sources_export_only_active_mode_and_report_diagnostic_without_deleting_data(): void {
		$content = '<!-- wp:nexuscontent/intro {"text":"Active block"} /-->';
		$id = $this->factory->post->create( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => $content ) );
		update_post_meta( $id, Editor_Mode::META_KEY, Editor_Mode::GUTENBERG );
		update_post_meta( $id, 'hero_heading', 'Inactive fixed hero' );
		update_post_meta( $id, 'nexus_sections', array( array( 'acf_fc_layout' => 'cta', 'heading' => 'Inactive flexible CTA' ) ) );
		$envelope = $this->envelope( $this->request( '/nexuscontent/v1/pages/' . $id ) );
		self::assertSame( array( 'intro' ), array_column( $envelope['data']['sections'], 'type' ) );
		self::assertSame( 'Inactive fixed hero', get_post_meta( $id, 'hero_heading', true ) );
		self::assertContains( Contract::ERROR_CONFLICTING_SECTION_SOURCES, array_column( $envelope['diagnostics'] ?? array(), 'code' ) );
	}
}
