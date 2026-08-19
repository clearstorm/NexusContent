<?php
/**
 * Request-scoped diagnostics.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Diagnostics {
	/** @var array<int, array{severity:string,code:string,message:string,path?:string}> */
	private array $entries = array();

	public function add( string $severity, string $code, string $message, ?string $path = null ): void {
		if ( ! in_array( $severity, array( 'error', 'warning', 'info' ), true ) ) {
			$severity = 'warning';
		}

		$normalized_code = preg_replace( '/[^a-z0-9_\/-]/', '', strtolower( $code ) );
		$entry           = array(
			'severity' => $severity,
			'code'     => is_string( $normalized_code ) && '' !== $normalized_code ? $normalized_code : 'wordpress/companion/diagnostic',
			'message'  => sanitize_text_field( $message ),
		);

		if ( null !== $path && '' !== $path ) {
			$entry['path'] = sanitize_text_field( $path );
		}

		$this->entries[] = $entry;
	}

	/** @return array<int, array{severity:string,code:string,message:string,path?:string}> */
	public function all(): array {
		return $this->entries;
	}

	public function has_errors(): bool {
		foreach ( $this->entries as $entry ) {
			if ( 'error' === $entry['severity'] ) {
				return true;
			}
		}

		return false;
	}
}
