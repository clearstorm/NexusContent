<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';
require_once dirname( __DIR__ ) . '/../includes/class-plugin.php';

use NexusContent\Companion\Plugin;
use NexusContent\Companion\Tests\TestCase;

final class PluginMenuSupportTest extends TestCase {
	public function test_register_menu_support_enables_menus(): void {
		self::assertFalse( current_theme_supports( 'menus' ) );

		Plugin::register_menu_support();

		self::assertTrue( current_theme_supports( 'menus' ) );
	}
}
