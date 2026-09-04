<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Contract;
use NexusContent\Companion\Diagnostics;
use NexusContent\Companion\Media_Normalizer;
use NexusContent\Companion\Tests\TestCase;
use WP_Post;

final class MediaNormalizerTest extends TestCase {
	public function test_normalizes_url_acf_array_and_object_shapes(): void {
		$media = new Media_Normalizer();
		self::assertSame(
			array( 'url' => 'https://example.test/a.jpg', 'mimeType' => 'image/*' ),
			$media->normalize( 'https://example.test/a.jpg' )
		);
		self::assertSame(
			array( 'url' => 'https://example.test/a.jpg', 'alt' => 'Remote', 'mimeType' => 'image/*' ),
			$media->normalize( array( 'url' => 'https://example.test/a.jpg', 'alt' => 'Remote' ) )
		);
		$expected = array(
			'url' => 'https://example.test/b.jpg', 'alt' => 'Alternative', 'caption' => '<em>Caption</em>',
			'width' => 800, 'height' => 600, 'mimeType' => 'image/jpeg',
			'sizes' => array( 'medium' => array( 'url' => 'https://example.test/b-300.jpg', 'width' => 300, 'height' => 225 ) ),
		);
		$acf = array(
			'URL' => $expected['url'], 'alt' => $expected['alt'], 'caption' => $expected['caption'],
			'width' => '800', 'height' => '600', 'mime_type' => 'image/jpeg',
			'sizes' => array( 'medium' => 'https://example.test/b-300.jpg', 'medium-width' => 300, 'medium-height' => 225 ),
		);
		self::assertEquals( $expected, $media->normalize( $acf ) );
		self::assertEquals( $expected, $media->normalize( (object) $acf ) );
	}

	public function test_attachment_shape_uses_wordpress_metadata_and_is_cached_per_instance(): void {
		$GLOBALS['nc_test']['posts'][7] = new WP_Post( array( 'ID' => 7, 'post_type' => 'attachment', 'post_status' => 'inherit', 'post_excerpt' => 'Caption' ) );
		$GLOBALS['nc_test']['attachment_urls'][7] = 'https://example.test/original.jpg';
		$GLOBALS['nc_test']['attachment_meta'][7] = array( 'width' => 1200, 'height' => 800, 'sizes' => array( 'medium' => array( 'mime-type' => 'image/jpeg' ) ) );
		$GLOBALS['nc_test']['attachment_sizes'][7]['medium'] = array( 'https://example.test/medium.jpg', 300, 200 );
		$GLOBALS['nc_test']['meta'][7]['_wp_attachment_image_alt'] = 'Attachment alt';
		$GLOBALS['nc_test']['mime'][7] = 'image/jpeg';
		$media = new Media_Normalizer();
		$first = $media->normalize( 7 );
		$second = $media->normalize( '7' );
		self::assertSame( $first, $second );
		self::assertSame( 1, $GLOBALS['nc_test']['attachment_calls'][7] );
		self::assertSame( '7', $first['id'] );
		self::assertSame( 1200, $first['width'] );
		self::assertSame( 'https://example.test/medium.jpg', $first['sizes']['medium']['url'] );
	}

	public function test_unavailable_attachment_returns_null_and_one_actionable_diagnostic(): void {
		$diagnostics = new Diagnostics();
		$media = new Media_Normalizer();
		self::assertNull( $media->normalize( 999, $diagnostics, 'sections.0.image' ) );
		self::assertNull( $media->normalize( 999, $diagnostics, 'sections.1.image' ) );
		self::assertCount( 1, $diagnostics->all(), 'A cached miss should not emit duplicate diagnostics.' );
		self::assertSame( Contract::ERROR_MEDIA_UNAVAILABLE, $diagnostics->all()[0]['code'] );
		self::assertSame( 'sections.0.image', $diagnostics->all()[0]['path'] );
	}

	public function test_rejects_empty_invalid_and_non_media_values(): void {
		$media = new Media_Normalizer();
		foreach ( array( null, false, '', 'javascript:alert(1)', array(), new \stdClass() ) as $value ) {
			self::assertNull( $media->normalize( $value ) );
		}
	}
}
