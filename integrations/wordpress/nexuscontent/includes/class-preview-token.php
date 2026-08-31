<?php
/**
 * Preview token minting and validation for draft content access.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Preview_Token {
	private const TRANSIENT_PREFIX = 'nexuscontent_preview_';
	private const DEFAULT_TTL      = 900; // 15 minutes.

	/**
	 * Mint a short-lived preview token for a given post.
	 *
	 * @param int $post_id Post to preview.
	 * @return array{token: string, expires_at: string} Token and expiry.
	 */
	public static function mint( int $post_id ): array {
		$token  = bin2hex( random_bytes( 32 ) );
		$ttl    = self::ttl();
		$expiry = time() + $ttl;

		set_transient(
			self::transient_key( $token ),
			array(
				'post_id' => $post_id,
				'user_id' => get_current_user_id(),
				'expires' => $expiry,
			),
			$ttl
		);

		return array(
			'token'      => $token,
			'expires_at' => gmdate( 'c', $expiry ),
		);
	}

	/**
	 * Validate a preview token and return its payload.
	 *
	 * @param string $token The preview token.
	 * @return array{post_id: int, user_id: int}|null Null when invalid or expired.
	 */
	public static function validate( string $token ): ?array {
		if ( '' === $token || ! preg_match( '/^[0-9a-f]{64}$/', $token ) ) {
			return null;
		}

		$payload = get_transient( self::transient_key( $token ) );
		if ( false === $payload || ! is_array( $payload ) ) {
			return null;
		}

		if ( ! isset( $payload['expires'], $payload['post_id'] ) || (int) $payload['expires'] < time() ) {
			self::revoke( $token );
			return null;
		}

		return array(
			'post_id' => (int) $payload['post_id'],
			'user_id' => isset( $payload['user_id'] ) ? (int) $payload['user_id'] : 0,
		);
	}

	/**
	 * Revoke a preview token immediately.
	 *
	 * @param string $token The preview token to delete.
	 */
	public static function revoke( string $token ): void {
		delete_transient( self::transient_key( $token ) );
	}

	/**
	 * Preview token TTL in seconds.
	 *
	 * Filterable via `nexuscontent_preview_token_ttl`.
	 */
	private static function ttl(): int {
		/**
		 * Filters the preview token time-to-live in seconds.
		 *
		 * @param int $ttl Default 900 (15 minutes).
		 */
		$ttl = (int) apply_filters( 'nexuscontent_preview_token_ttl', self::DEFAULT_TTL );
		return $ttl > 0 ? $ttl : self::DEFAULT_TTL;
	}

	private static function transient_key( string $token ): string {
		return self::TRANSIENT_PREFIX . $token;
	}
}
