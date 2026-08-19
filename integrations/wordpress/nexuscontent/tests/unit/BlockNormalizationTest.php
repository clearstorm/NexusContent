<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Contract;
use NexusContent\Companion\Diagnostics;
use NexusContent\Companion\Block_Normalizer;
use NexusContent\Companion\Tests\TestCase;

final class BlockNormalizationTest extends TestCase {
	public function test_core_rich_blocks_are_coalesced_and_keep_structured_block_details(): void {
		$post = $this->post();
		$GLOBALS['nc_test']['blocks'] = array(
			array( 'blockName' => 'core/heading', 'attrs' => array( 'level' => 2 ), 'innerHTML' => '<h2>Heading</h2>' ),
			array( 'blockName' => 'core/paragraph', 'attrs' => array(), 'innerHTML' => '<p>Paragraph</p>' ),
		);
		$section = $this->normalizedPage( $post )['sections'][0];
		self::assertSame( 'rich_text', $section['type'] );
		self::assertSame( "<h2>Heading</h2>\n<p>Paragraph</p>", $section['data']['body'] );
		self::assertSame( array( 'core/heading', 'core/paragraph' ), array_column( $section['data']['blocks'], 'type' ) );
	}

	public function test_nested_container_sections_preserve_document_order_and_unique_ids(): void {
		$post = $this->post();
		$GLOBALS['nc_test']['blocks'] = array(
			array( 'blockName' => 'core/paragraph', 'attrs' => array(), 'innerHTML' => '<p>Before</p>' ),
			array( 'blockName' => 'core/group', 'attrs' => array(), 'innerHTML' => '', 'innerBlocks' => array(
				array( 'blockName' => 'nexuscontent/intro', 'attrs' => array( 'text' => 'Nested' ), 'innerHTML' => '' ),
			) ),
			array( 'blockName' => 'nexuscontent/cta', 'attrs' => array( 'heading' => 'After' ), 'innerHTML' => '' ),
		);
		$sections = $this->normalizedPage( $post )['sections'];
		self::assertSame( array( 'rich_text', 'intro', 'cta' ), array_column( $sections, 'type' ) );
		self::assertSame( array_unique( array_column( $sections, 'id' ) ), array_column( $sections, 'id' ) );
	}

	public function test_unknown_visible_block_is_diagnosed_and_preserved_as_unsupported_rich_content(): void {
		$post = $this->post();
		$diagnostics = new Diagnostics();
		$GLOBALS['nc_test']['blocks'] = array( array( 'blockName' => 'vendor/map', 'attrs' => array( 'token' => 'private' ), 'innerHTML' => '<div>Visible map fallback</div>' ) );
		$page = $this->normalizedPage( $post, $diagnostics );
		self::assertSame( 'rich_text', $page['sections'][0]['type'] );
		self::assertTrue( $page['sections'][0]['data']['blocks'][0]['unsupported'] );
		self::assertStringContainsString( 'Visible map fallback', $page['sections'][0]['data']['body'] );
		self::assertSame( Contract::ERROR_UNKNOWN_BLOCK, $diagnostics->all()[0]['code'] );
		self::assertArrayNotHasKey( 'token', $page['sections'][0]['data']['blocks'][0]['attributes'] );
	}

	public function test_unknown_acf_block_uses_specific_diagnostic_and_preserves_html(): void {
		$post = $this->post();
		$diagnostics = new Diagnostics();
		$GLOBALS['nc_test']['blocks'] = array( array( 'blockName' => 'acf/legacy-banner', 'attrs' => array(), 'innerHTML' => '<aside>Legacy</aside>' ) );
		$page = $this->normalizedPage( $post, $diagnostics );
		self::assertSame( Contract::ERROR_UNKNOWN_ACF_BLOCK, $diagnostics->all()[0]['code'] );
		self::assertStringContainsString( 'Legacy', $page['sections'][0]['data']['body'] );
	}

	public function test_explicit_anchor_wins_and_fallback_ids_are_deterministic(): void {
		$post = $this->post();
		$GLOBALS['nc_test']['blocks'] = array(
			array( 'blockName' => 'nexuscontent/hero', 'attrs' => array( 'anchor' => 'Primary Hero', 'heading' => 'One' ), 'innerHTML' => '' ),
			array( 'blockName' => 'nexuscontent/intro', 'attrs' => array( 'text' => 'Two' ), 'innerHTML' => '' ),
		);
		$first = $this->normalizedPage( $post )['sections'];
		$second = $this->normalizedPage( $post )['sections'];
		self::assertSame( 'primary-hero', $first[0]['id'] );
		self::assertSame( 'page-42-intro-1', $first[1]['id'] );
		self::assertSame( array_column( $first, 'id' ), array_column( $second, 'id' ) );
	}

	public function test_editor_preview_flag_is_not_normalized_as_content(): void {
		$normalized = Block_Normalizer::normalize( array( 'heading' => 'Visible', 'preview' => true ) );
		self::assertSame( array( 'heading' => 'Visible' ), $normalized );

		$GLOBALS['nc_test']['blocks'] = array(
			array( 'blockName' => 'nexuscontent/hero', 'attrs' => array( 'heading' => 'Visible', 'preview' => true ), 'innerHTML' => '' ),
		);
		$section = $this->normalizedPage( $this->post() )['sections'][0];
		self::assertArrayNotHasKey( 'preview', $section['data'] );
	}

	public function test_logo_grid_normalization_preserves_labels_and_images_independently(): void {
		$normalized = Block_Normalizer::normalize(
			array(
				'items' => array(
					array( 'label' => 'Label only' ),
					array( 'image' => array( 'url' => 'https://example.test/logo-only.png', 'alt' => 'Logo only' ) ),
					array( 'label' => 'Both', 'image' => array( 'url' => 'https://example.test/both.png', 'alt' => 'Both logo' ) ),
				),
			)
		);
		self::assertSame( 'Label only', $normalized['items'][0]['label'] );
		self::assertSame( 'logo-only.png', basename( $normalized['items'][1]['image']['url'] ) );
		self::assertSame( 'Both', $normalized['items'][2]['label'] );
		self::assertSame( 'both.png', basename( $normalized['items'][2]['image']['url'] ) );
	}
}
