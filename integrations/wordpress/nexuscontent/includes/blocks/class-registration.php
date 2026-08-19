<?php
/**
 * Bootstrap bridge for native block integration.
 *
 * @package NexusContent
 */

namespace NexusContent\Companion\Blocks;

use NexusContent\Companion\Block_Loader;
use NexusContent\Companion\Capabilities;
use NexusContent\Companion\Section_Registry;

defined( 'ABSPATH' ) || exit;

final class Registration {
	/**
	 * @param Section_Registry $registry Core section registry.
	 */
	public static function register( Section_Registry $registry ) {
		$loader = new Block_Loader( $registry, new Capabilities( $registry ) );
		$loader->register();
	}
}
