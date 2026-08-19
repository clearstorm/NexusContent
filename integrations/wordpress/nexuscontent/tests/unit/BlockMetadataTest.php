<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Block_Loader;
use NexusContent\Companion\Tests\TestCase;

final class BlockMetadataTest extends TestCase {
	public function test_all_blocks_have_packaged_static_previews(): void {
		$plugin_root = dirname( __DIR__, 2 );

		foreach ( Block_Loader::block_types() as $type ) {
			$metadata_path = $plugin_root . '/blocks/' . $type . '/block.json';
			$metadata      = json_decode( (string) file_get_contents( $metadata_path ), true, 512, JSON_THROW_ON_ERROR );
			self::assertSame( array( 'type' => 'boolean', 'default' => false ), $metadata['attributes']['preview'], $type );
			self::assertTrue( $metadata['example']['attributes']['preview'], $type );

			$preview_path = $plugin_root . '/assets/previews/' . $type . '.svg';
			self::assertFileExists( $preview_path );
			self::assertStringContainsString( '<svg', (string) file_get_contents( $preview_path ) );
		}
	}
}
