<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Preview_Token;
use NexusContent\Companion\Tests\TestCase;

final class PreviewTokenTest extends TestCase {
	public function test_mint_returns_64_hex_token_and_stores_payload(): void {
		$data = Preview_Token::mint( 42 );
		self::assertMatchesRegularExpression( '/^[0-9a-f]{64}$/', $data['token'] );
		self::assertIsString( $data['expires_at'] );

		$payload = Preview_Token::validate( $data['token'] );
		self::assertSame( 42, $payload['post_id'] );
	}

	public function test_validate_returns_null_for_garbage_token(): void {
		self::assertNull( Preview_Token::validate( 'not-a-token' ) );
	}

	public function test_revoke_prevents_reuse(): void {
		$data = Preview_Token::mint( 1 );
		Preview_Token::revoke( $data['token'] );
		self::assertNull( Preview_Token::validate( $data['token'] ) );
	}

	public function test_validate_returns_null_for_expired_token(): void {
		$data = Preview_Token::mint( 2 );
		$GLOBALS['nc_test']['transients'][ 'nexuscontent_preview_' . $data['token'] ]['expires'] = time() - 10;
		self::assertNull( Preview_Token::validate( $data['token'] ) );
	}
}
