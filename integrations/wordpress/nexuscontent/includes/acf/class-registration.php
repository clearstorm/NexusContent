<?php
/**
 * Bootstrap bridge for optional ACF integration.
 *
 * @package NexusContent
 */

namespace NexusContent\Companion\ACF;

use NexusContent\Companion\ACF_Loader;
use NexusContent\Companion\Section_Registry;

defined( 'ABSPATH' ) || exit;

final class Registration {
	/**
	 * @param Section_Registry $registry Core section registry.
	 */
	public static function register( Section_Registry $registry ) {
		$loader = new ACF_Loader( $registry );
		$loader->register();
	}
}
