<?php
/**
 * Plugin Name: Momentum Pro Editor
 * Description: Elementor widget that parses HTML code and provides visual controls for easy editing
 * Version: 1.0.1
 * Author: Yasser Momentum
 * Author URI: https://momentummix.com/
 * License: GPL v3
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: momentum-pro-editor
 * Requires Plugins: elementor
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'MOMENTUM_PRO_VERSION', '1.0.1' );
define( 'MOMENTUM_PRO_PATH', plugin_dir_path( __FILE__ ) );
define( 'MOMENTUM_PRO_URL', plugin_dir_url( __FILE__ ) );

/**
 * Main Momentum Pro Editor Class
 */
final class Momentum_Pro_Editor {

    private static $_instance = null;

    public static function instance() {
        if ( is_null( self::$_instance ) ) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        add_action( 'plugins_loaded', [ $this, 'init' ] );
    }

    public function init() {
        // Check if Elementor is installed and activated
        if ( ! did_action( 'elementor/loaded' ) ) {
            add_action( 'admin_notices', [ $this, 'admin_notice_missing_elementor' ] );
            return;
        }

        // Register widget category early
        add_action( 'elementor/elements/categories_registered', [ $this, 'register_categories' ] );

        // Register widgets
        add_action( 'elementor/widgets/register', [ $this, 'register_widgets' ] );

        // Register editor scripts (only in Elementor editor)
        add_action( 'elementor/editor/before_enqueue_scripts', [ $this, 'editor_scripts' ] );

        // Register preview scripts (only in Elementor preview iframe)
        add_action( 'elementor/preview/enqueue_scripts', [ $this, 'preview_scripts' ] );

        // Register frontend styles only (NO JS on frontend)
        add_action( 'elementor/frontend/after_enqueue_styles', [ $this, 'frontend_styles' ] );
    }

    public function admin_notice_missing_elementor() {
        ?>
        <div class="notice notice-warning is-dismissible">
            <p><?php esc_html_e( 'Momentum Pro Editor requires Elementor to be installed and activated.', 'momentum-pro-editor' ); ?></p>
        </div>
        <?php
    }

    public function register_categories( $elements_manager ) {
        $elements_manager->add_category( 'momentum-pro', [
            'title' => esc_html__( 'Momentum Pro', 'momentum-pro-editor' ),
            'icon'  => 'fa fa-code',
        ] );
    }

    public function register_widgets( $widgets_manager ) {
        require_once MOMENTUM_PRO_PATH . 'widgets/html-pro-widget.php';
        $widgets_manager->register( new \Momentum_HTML_Pro_Widget() );
    }

    public function editor_scripts() {
        // These only load in the Elementor editor panel
        wp_enqueue_style(
            'momentum-editor-style',
            MOMENTUM_PRO_URL . 'assets/css/editor-style.css',
            [],
            MOMENTUM_PRO_VERSION
        );

        wp_enqueue_script(
            'momentum-editor-controls',
            MOMENTUM_PRO_URL . 'assets/js/editor-controls.js',
            [ 'jquery', 'elementor-editor' ],
            MOMENTUM_PRO_VERSION,
            true
        );
    }

    public function preview_scripts() {
        // These only load inside the Elementor preview iframe
        wp_enqueue_script(
            'momentum-parser',
            MOMENTUM_PRO_URL . 'assets/js/parser.js',
            [ 'jquery' ],
            MOMENTUM_PRO_VERSION,
            true
        );

        wp_enqueue_style(
            'momentum-preview-style',
            MOMENTUM_PRO_URL . 'assets/css/preview-style.css',
            [],
            MOMENTUM_PRO_VERSION
        );
    }

    public function frontend_styles() {
        // Only CSS on frontend - NO JavaScript
        wp_enqueue_style(
            'momentum-frontend-style',
            MOMENTUM_PRO_URL . 'assets/css/frontend-style.css',
            [],
            MOMENTUM_PRO_VERSION
        );
    }
}

Momentum_Pro_Editor::instance();
