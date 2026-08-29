<?php

$constants = array(
	'ABSPATH'                                => __DIR__ . '/../',
	'NEXUSCONTENT_COMPANION_VERSION'         => '0.1.1',
	'NEXUSCONTENT_COMPANION_CONTRACT_VERSION' => 1,
	'NEXUSCONTENT_COMPANION_REST_NAMESPACE'  => 'nexuscontent/v1',
	'NEXUSCONTENT_COMPANION_FILE'            => __DIR__ . '/../nexuscontent.php',
	'NEXUSCONTENT_COMPANION_DIR'             => __DIR__ . '/../',
);

foreach ( $constants as $name => $value ) {
	if ( ! defined( $name ) ) {
		define( $name, $value );
	}
}
