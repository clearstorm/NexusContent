<?php

namespace NexusContent\Companion\Tests\Integration;

require_once __DIR__ . '/IntegrationTestCase.php';

use NexusContent\Companion\Plugin;

final class MenuSupportIntegrationTest extends IntegrationTestCase {
	public function test_companion_registers_menu_support_on_after_setup_theme(): void {
		self::assertNotFalse(
			has_action( 'after_setup_theme', array( Plugin::class, 'register_menu_support' ) ),
			'The companion must register menu support on after_setup_theme so block themes get the classic Menus screen.'
		);
	}
}
