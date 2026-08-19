<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Contract;
use NexusContent\Companion\Diagnostics;
use NexusContent\Companion\Tests\TestCase;

final class DiagnosticsContractTest extends TestCase {
	public function test_diagnostics_sanitize_severity_code_message_and_path_in_order(): void {
		$diagnostics = new Diagnostics();
		$diagnostics->add( 'fatal', 'WordPress/Bad Code<script>', '<b>Unsafe</b>', 'sections.<0>' );
		$diagnostics->add( 'error', Contract::ERROR_INVALID_SECTION, 'Invalid section' );
		self::assertSame(
			array(
				array( 'severity' => 'warning', 'code' => 'wordpress/badcodescript', 'message' => 'Unsafe', 'path' => 'sections.' ),
				array( 'severity' => 'error', 'code' => Contract::ERROR_INVALID_SECTION, 'message' => 'Invalid section' ),
			),
			$diagnostics->all()
		);
		self::assertTrue( $diagnostics->has_errors() );
	}

	public function test_canonical_rest_fixtures_validate_as_exact_envelopes(): void {
		$contract = new Contract();
		foreach ( array( 'page', 'pages', 'schema', 'capabilities' ) as $shape ) {
			$fixture = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/rest/' . $shape . '.json' ), true, 512, JSON_THROW_ON_ERROR );
			self::assertTrue( $contract->validate( $fixture, $shape ), $shape . ' fixture did not validate' );
		}
	}

	public function test_envelope_rejects_wrong_version_extra_keys_objects_and_bad_diagnostics(): void {
		$contract = new Contract();
		$page = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/rest/page.json' ), true, 512, JSON_THROW_ON_ERROR );
		foreach ( array(
			array_replace( $page, array( 'contractVersion' => '1' ) ),
			array_replace( $page, array( 'extra' => true ) ),
			array_replace( $page, array( 'diagnostics' => array( array( 'severity' => 'fatal', 'code' => 'x', 'message' => 'x' ) ) ) ),
			array_replace( $page, array( 'data' => array( 'object' => new \stdClass() ) ) ),
		) as $invalid ) {
			self::assertFalse( $contract->validate( $invalid, 'page' ) );
		}
		self::assertFalse( $contract->validate( $page, 'unknown' ) );
	}

	public function test_contract_rejects_malformed_sections_pagination_schema_and_capabilities(): void {
		$contract = new Contract();
		$page = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/rest/page.json' ), true, 512, JSON_THROW_ON_ERROR );
		$page['data']['sections'][] = array( 'id' => 1, 'type' => 'hero', 'data' => array() );
		self::assertFalse( $contract->validate( $page, 'page' ) );
		$pages = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/rest/pages.json' ), true, 512, JSON_THROW_ON_ERROR );
		$pages['data']['pagination']['page'] = 0;
		self::assertFalse( $contract->validate( $pages, 'pages' ) );
		$schema = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/rest/schema.json' ), true, 512, JSON_THROW_ON_ERROR );
		$schema['data']['sectionDefinitions'][0]['fields'][0]['type'] = 'callable';
		self::assertFalse( $contract->validate( $schema, 'schema' ) );
		$schema['data']['sectionDefinitions'][0]['fields'][0]['type'] = 'string';
		$schema['data']['editorModes'][] = 'legacy';
		self::assertFalse( $contract->validate( $schema, 'schema' ) );
		$capabilities = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/rest/capabilities.json' ), true, 512, JSON_THROW_ON_ERROR );
		$capabilities['data']['acf'] = 0;
		self::assertFalse( $contract->validate( $capabilities, 'capabilities' ) );
	}

	public function test_embed_sanitizer_removes_scripts_events_and_javascript_urls(): void {
		$html = '<form action="/safe"><script>alert(1)</script><input onfocus="alert(1)"><a href="javascript:alert(1)">Bad</a></form>';
		$clean = Contract::sanitize_embed( $html );
		self::assertStringContainsString( '<form', $clean );
		self::assertStringNotContainsString( '<script', $clean );
		self::assertStringNotContainsString( 'onfocus', $clean );
		self::assertStringNotContainsString( 'javascript:', $clean );
	}
}
