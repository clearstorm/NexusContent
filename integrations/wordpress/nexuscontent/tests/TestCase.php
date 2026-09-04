<?php

namespace NexusContent\Companion\Tests;

use NexusContent\Companion\Capabilities;
use NexusContent\Companion\Diagnostics;
use NexusContent\Companion\Editor_Mode;
use NexusContent\Companion\Media_Normalizer;
use NexusContent\Companion\Normalizer;
use NexusContent\Companion\Section_Registry;
use NexusContent\Companion\Seo_Fields;
use PHPUnit\Framework\TestCase as PHPUnitTestCase;
use WP_Post;

abstract class TestCase extends PHPUnitTestCase {
	protected function setUp(): void {
		parent::setUp();
		\nc_test_reset();
	}

	protected function normalizer(): Normalizer {
		return new Normalizer( new Editor_Mode( new Capabilities() ), new Section_Registry(), new Media_Normalizer(), new Seo_Fields() );
	}

	/** @param array<string, mixed> $overrides */
	protected function post( array $overrides = array() ): WP_Post {
		$post = new WP_Post( array_merge( array( 'ID' => 42, 'post_name' => 'fixture-page', 'post_title' => 'Fixture page' ), $overrides ) );
		$GLOBALS['nc_test']['posts'][ $post->ID ] = $post;
		return $post;
	}

	/** @return array<string, mixed> */
	protected function fixture( string $type ): array {
		$path = __DIR__ . '/fixtures/sections/' . str_replace( '_', '-', $type ) . '.json';
		$data = json_decode( (string) file_get_contents( $path ), true, 512, JSON_THROW_ON_ERROR );
		self::assertIsArray( $data );
		return $data;
	}

	/** @return array<string, mixed> */
	protected function normalizedPage( WP_Post $post, ?Diagnostics $diagnostics = null ): array {
		return $this->normalizer()->page( $post, $diagnostics ?? new Diagnostics() );
	}

	/** @param array<string, mixed> $section @return array<string, mixed> */
	protected function canonical( array $section ): array {
		$result = array( 'type' => $section['type'], 'data' => $section['data'] );
		if ( isset( $section['settings'] ) ) {
			$result['settings'] = $section['settings'];
		}
		return $result;
	}
}
