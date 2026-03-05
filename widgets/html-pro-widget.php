<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Momentum_HTML_Pro_Widget extends \Elementor\Widget_Base {

    public function get_name() {
        return 'momentum_html_pro';
    }

    public function get_title() {
        return esc_html__( 'Momentum Pro Editor', 'momentum-pro-editor' );
    }

    public function get_icon() {
        return 'eicon-code';
    }

    public function get_categories() {
        return [ 'momentum-pro' ];
    }

    public function get_keywords() {
        return [ 'html', 'code', 'momentum', 'pro', 'editor', 'custom', 'inline' ];
    }

    protected function register_controls() {

        // ============================================
        // TAB: HTML CODE
        // ============================================
        $this->start_controls_section(
            'section_html_code',
            [
                'label' => esc_html__( '📌 كود HTML', 'momentum-pro-editor' ),
                'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'html_code',
            [
                'label'    => esc_html__( 'الكود', 'momentum-pro-editor' ),
                'type'     => \Elementor\Controls_Manager::CODE,
                'language' => 'html',
                'rows'     => 20,
                'default'  => '<div style="padding:40px; text-align:center;">
    <h1 style="color:#333; font-size:36px; margin-bottom:15px;">مرحباً بيك في Momentum Pro Editor</h1>
    <p style="color:#666; font-size:18px; margin-bottom:25px;">حدد أي كلمة وغيّر لونها أو نسّقها كما تشاء</p>
    <a href="https://example.com" style="background:#6C63FF; color:#fff; padding:12px 30px; border-radius:8px; text-decoration:none; font-size:16px; display:inline-block;">اضغط هنا</a>
    <img src="https://via.placeholder.com/600x300/6C63FF/ffffff?text=Momentum+Pro" alt="صورة تجريبية" width="600" height="300" style="margin-top:25px; border-radius:12px; display:block; margin-left:auto; margin-right:auto;">
    <p style="color:#999; font-size:14px; margin-top:20px;">اضغط مرتين على أي رابط عشان تعدله</p>
</div>',
            ]
        );

        $this->add_control(
            'sync_code_button',
            [
                'type' => \Elementor\Controls_Manager::RAW_HTML,
                'raw'  => '<div style="margin-top:10px;">
                    <button type="button" id="momentum-sync-btn" onclick="momentumSyncToCode()" style="background:linear-gradient(135deg,#4CAF50,#2E7D32);color:#fff;padding:12px 20px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;width:100%;box-shadow:0 2px 10px rgba(76,175,80,0.3);transition:all 0.2s;">
                        🔄 مزامنة التعديلات مع الكود
                    </button>
                    <div id="momentum-sync-status" style="text-align:center;margin-top:6px;font-size:11px;color:#888;min-height:16px;"></div>
                </div>',
            ]
        );

        $this->add_control(
            'usage_guide',
            [
                'type' => \Elementor\Controls_Manager::RAW_HTML,
                'raw'  => '<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:16px;border-radius:10px;margin-top:10px;line-height:1.8;border:1px solid rgba(108,99,255,0.3);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSIxMCIgZmlsbD0iIzZDNjNGRiIvPjx0ZXh0IHg9IjEwIiB5PSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPk08L3RleHQ+PC9zdmc+" style="width:20px;height:20px;">
                        <strong style="font-size:14px;">Momentum Pro v5</strong>
                    </div>
                    ✏️ اضغط على أي <strong>نص</strong> عشان تعدله<br>
                    🎯 <strong>حدد جزء من النص</strong> وغيّر لونه أو نسّقه<br>
                    🎨 استخدم <strong>الـ Toolbar</strong> لتغيير الألوان والخطوط<br>
                    📷 اضغط على أي <strong>صورة</strong> عشان تغيرها<br>
                    🔗 اضغط مرتين على أي <strong>رابط</strong> عشان تعدله<br>
                    🖱️ كليك يمين على أي <strong>Box</strong> لأدوات متقدمة<br>
                    📱 استخدم تاب <strong>الريسبونسيف</strong> لتعديلات الموبايل<br>
                    ↩️ <strong>Ctrl+Z</strong> للتراجع<br>
                    🔄 اضغط <strong>مزامنة</strong> عشان التعديلات تنعكس على الكود
                </div>',
            ]
        );

        $this->end_controls_section();

        // ============================================
        // TAB: RESPONSIVE SETTINGS
        // ============================================
        $this->start_controls_section(
            'section_responsive',
            [
                'label' => esc_html__( '📱 إعدادات الريسبونسيف', 'momentum-pro-editor' ),
                'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'responsive_enabled',
            [
                'label'        => esc_html__( 'تفعيل التحكم بالريسبونسيف', 'momentum-pro-editor' ),
                'type'         => \Elementor\Controls_Manager::SWITCHER,
                'label_on'     => esc_html__( 'فعّال', 'momentum-pro-editor' ),
                'label_off'    => esc_html__( 'مُعطّل', 'momentum-pro-editor' ),
                'return_value' => 'yes',
                'default'      => 'yes',
            ]
        );

        // Mobile max-width override
        $this->add_control(
            'mobile_heading',
            [
                'label'     => esc_html__( '📱 الموبايل (أقل من 768px)', 'momentum-pro-editor' ),
                'type'      => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
                'condition' => [ 'responsive_enabled' => 'yes' ],
            ]
        );

        $this->add_control(
            'mobile_font_scale',
            [
                'label'     => esc_html__( 'نسبة تصغير الخط %', 'momentum-pro-editor' ),
                'type'      => \Elementor\Controls_Manager::SLIDER,
                'range'     => [
                    'px' => [ 'min' => 50, 'max' => 100, 'step' => 5 ],
                ],
                'default'   => [ 'size' => 85, 'unit' => 'px' ],
                'condition' => [ 'responsive_enabled' => 'yes' ],
            ]
        );

        $this->add_control(
            'mobile_padding_scale',
            [
                'label'     => esc_html__( 'نسبة تصغير المسافات %', 'momentum-pro-editor' ),
                'type'      => \Elementor\Controls_Manager::SLIDER,
                'range'     => [
                    'px' => [ 'min' => 30, 'max' => 100, 'step' => 5 ],
                ],
                'default'   => [ 'size' => 70, 'unit' => 'px' ],
                'condition' => [ 'responsive_enabled' => 'yes' ],
            ]
        );

        $this->add_control(
            'mobile_img_max_width',
            [
                'label'     => esc_html__( 'أقصى عرض للصور', 'momentum-pro-editor' ),
                'type'      => \Elementor\Controls_Manager::SLIDER,
                'range'     => [
                    '%' => [ 'min' => 50, 'max' => 100, 'step' => 5 ],
                ],
                'default'   => [ 'size' => 100, 'unit' => '%' ],
                'condition' => [ 'responsive_enabled' => 'yes' ],
            ]
        );

        $this->add_control(
            'mobile_hide_elements',
            [
                'label'       => esc_html__( 'إخفاء عناصر (CSS selectors)', 'momentum-pro-editor' ),
                'type'        => \Elementor\Controls_Manager::TEXT,
                'placeholder' => '.desktop-only, .hide-mobile',
                'condition'   => [ 'responsive_enabled' => 'yes' ],
                'description' => esc_html__( 'ضع CSS selectors للعناصر اللي عايز تخفيها في الموبايل', 'momentum-pro-editor' ),
            ]
        );

        // Tablet
        $this->add_control(
            'tablet_heading',
            [
                'label'     => esc_html__( '📋 التابلت (768px - 1024px)', 'momentum-pro-editor' ),
                'type'      => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
                'condition' => [ 'responsive_enabled' => 'yes' ],
            ]
        );

        $this->add_control(
            'tablet_font_scale',
            [
                'label'     => esc_html__( 'نسبة تصغير الخط %', 'momentum-pro-editor' ),
                'type'      => \Elementor\Controls_Manager::SLIDER,
                'range'     => [
                    'px' => [ 'min' => 60, 'max' => 100, 'step' => 5 ],
                ],
                'default'   => [ 'size' => 92, 'unit' => 'px' ],
                'condition' => [ 'responsive_enabled' => 'yes' ],
            ]
        );

        $this->end_controls_section();

        // ============================================
        // STYLE: SPACING
        // ============================================
        $this->start_controls_section(
            'section_spacing',
            [
                'label' => esc_html__( '📏 المسافات', 'momentum-pro-editor' ),
                'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'container_padding',
            [
                'label'      => esc_html__( 'Padding', 'momentum-pro-editor' ),
                'type'       => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%', 'em' ],
                'selectors'  => [
                    '{{WRAPPER}} .momentum-html-output' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'container_margin',
            [
                'label'      => esc_html__( 'Margin', 'momentum-pro-editor' ),
                'type'       => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%', 'em' ],
                'selectors'  => [
                    '{{WRAPPER}} .momentum-html-output' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'container_bg',
            [
                'label'     => esc_html__( 'لون الخلفية', 'momentum-pro-editor' ),
                'type'      => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .momentum-html-output' => 'background-color: {{VALUE}};',
                ],
            ]
        );

        $this->add_control(
            'container_radius',
            [
                'label'      => esc_html__( 'حواف دائرية', 'momentum-pro-editor' ),
                'type'       => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%' ],
                'selectors'  => [
                    '{{WRAPPER}} .momentum-html-output' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name'     => 'container_shadow',
                'selector' => '{{WRAPPER}} .momentum-html-output',
            ]
        );

        $this->end_controls_section();

        // ============================================
        // STYLE: CUSTOM CSS
        // ============================================
        $this->start_controls_section(
            'section_css',
            [
                'label' => esc_html__( '🎨 CSS إضافي', 'momentum-pro-editor' ),
                'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'custom_css',
            [
                'label'    => esc_html__( 'CSS', 'momentum-pro-editor' ),
                'type'     => \Elementor\Controls_Manager::CODE,
                'language' => 'css',
                'rows'     => 10,
                'default'  => '',
            ]
        );

        $this->end_controls_section();
    }

    // ============================================
    // RENDER
    // ============================================
    protected function render() {
        $settings   = $this->get_settings_for_display();
        $html_code  = $settings['html_code'] ?? '';
        $custom_css = $settings['custom_css'] ?? '';
        $widget_id  = $this->get_id();
        $is_editor  = \Elementor\Plugin::$instance->editor->is_edit_mode();

        // Responsive settings
        $responsive_enabled = $settings['responsive_enabled'] ?? 'yes';
        $mobile_font_scale  = $settings['mobile_font_scale']['size'] ?? 85;
        $mobile_pad_scale   = $settings['mobile_padding_scale']['size'] ?? 70;
        $mobile_img_max     = $settings['mobile_img_max_width']['size'] ?? 100;
        $mobile_hide        = $settings['mobile_hide_elements'] ?? '';
        $tablet_font_scale  = $settings['tablet_font_scale']['size'] ?? 92;

        if ( empty( $html_code ) ) {
            if ( $is_editor ) {
                echo '<div class="momentum-html-output" data-widget-id="' . esc_attr( $widget_id ) . '" style="padding:50px;text-align:center;background:#f8f9fa;border:2px dashed #ddd;border-radius:12px;">';
                echo '<div style="margin-bottom:10px;"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" fill="#6C63FF"/><text x="20" y="26" text-anchor="middle" fill="#fff" font-size="20" font-weight="bold">M</text></svg></div>';
                echo '<p style="color:#999;font-size:18px;">📝 حط كود HTML هنا</p>';
                echo '</div>';
            }
            return;
        }

        $editor_class = $is_editor ? ' momentum-editable' : '';

        echo '<div class="momentum-html-output' . $editor_class . '" data-widget-id="' . esc_attr( $widget_id ) . '">';

        // Responsive CSS
        if ( $responsive_enabled === 'yes' ) {
            $responsive_css = '';

            // Mobile styles
            $responsive_css .= '@media screen and (max-width: 767px) {';
            $responsive_css .= '.momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] * { font-size: calc(var(--m-original-fs, 1em) * ' . ($mobile_font_scale / 100) . ') !important; }';
            $responsive_css .= '.momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] h1, .momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] h2, .momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] h3, .momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] h4, .momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] h5, .momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] h6, .momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] p, .momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] span, .momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] a, .momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] li { word-wrap: break-word; overflow-wrap: break-word; }';
            $responsive_css .= '.momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] div, .momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] section { padding: calc(var(--m-original-pad, 0px) * ' . ($mobile_pad_scale / 100) . ') !important; }';
            $responsive_css .= '.momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] img { max-width: ' . $mobile_img_max . '% !important; height: auto !important; }';

            if ( ! empty( $mobile_hide ) ) {
                $selectors = array_map( 'trim', explode( ',', $mobile_hide ) );
                foreach ( $selectors as $sel ) {
                    $sel = wp_strip_all_tags( $sel );
                    if ( ! empty( $sel ) ) {
                        $responsive_css .= '.momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] ' . $sel . ' { display: none !important; }';
                    }
                }
            }
            $responsive_css .= '}';

            // Tablet styles
            $responsive_css .= '@media screen and (min-width: 768px) and (max-width: 1024px) {';
            $responsive_css .= '.momentum-html-output[data-widget-id="' . esc_attr( $widget_id ) . '"] * { font-size: calc(var(--m-original-fs, 1em) * ' . ($tablet_font_scale / 100) . ') !important; }';
            $responsive_css .= '}';

            echo '<style class="momentum-responsive-css">' . $responsive_css . '</style>';
        }

        if ( ! empty( $custom_css ) ) {
            echo '<style class="momentum-custom-css">' . wp_strip_all_tags( $custom_css ) . '</style>';
        }

        echo $html_code;
        echo '</div>';
    }
}
