library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

library twentynm;
use twentynm.twentynm_components.all;

library work;
use work.pkg_dsp.all;

entity dsp is
  generic (
    g_WIDTH_ACTIVATION  : positive := 16;
    g_WIDTH_WEIGHT      : positive := 16;
		g_WIDTH_RESULT      : positive;
		g_SCANIN_A          : boolean;
		g_SCANIN_B          : boolean;
		g_CHAINADD          : boolean
  );
  port (
    i_Clk             : in  std_ulogic := '0';
    i_Reset           : in  std_ulogic := '0';
    i_Enable          : in  std_ulogic := '0';

    i_ActivationA     : in  std_ulogic_vector(g_WIDTH_ACTIVATION-1 downto 0) := (others => '0');
    i_ActivationB     : in  std_ulogic_vector(g_WIDTH_ACTIVATION-1 downto 0) := (others => '0');

    i_ActivationChain : in  std_ulogic_vector(g_WIDTH_ACTIVATION-1 downto 0) := (others => '0');
    o_ActivationChain : out std_ulogic_vector(g_WIDTH_ACTIVATION-1 downto 0) := (others => '0');

		i_SumChain        : in  std_ulogic_vector(63 downto 0) := (others => '0');
    o_SumChain        : out std_ulogic_vector(63 downto 0) := (others => '0');

		o_Result          : out std_ulogic_vector(g_WIDTH_RESULT-1 downto 0) := (others => '0');

    i_WeightA         : in  std_ulogic_vector(g_WIDTH_WEIGHT-1 downto 0) := (others => '0');
    i_WeightB         : in  std_ulogic_vector(g_WIDTH_WEIGHT-1 downto 0) := (others => '0');

		i_WeightsCommit   : in std_ulogic := '0'
  );
end entity;


architecture behav of dsp is
begin
	inst_dsp: twentynm_mac
		generic map (
			ax_width                  => g_WIDTH_WEIGHT,
			ay_scan_in_width          => g_WIDTH_ACTIVATION,
			bx_width                  => g_WIDTH_WEIGHT,
			by_width                  => g_WIDTH_ACTIVATION,
			operation_mode            => "m18x18_systolic",
			mode_sub_location         => 0,
			operand_source_max        => "input",
			operand_source_may        => "input",
			operand_source_mbx        => "input",
			operand_source_mby        => "input",
			signed_max                => "true",
			signed_may                => "true",
			signed_mbx                => "true",
			signed_mby                => "true",
			preadder_subtract_a       => "false",
			preadder_subtract_b       => "false",
			ay_use_scan_in            => boolean'image(g_SCANIN_A),
			by_use_scan_in            => boolean'image(g_SCANIN_B),
			delay_scan_out_ay         => "true",
			delay_scan_out_by         => "true",
			use_chainadder            => boolean'image(g_CHAINADD),
			enable_double_accum       => "false",
			load_const_value          => 0,
			ax_clock                  => "1",
			ay_scan_in_clock          => "0",
			az_clock                  => "none",
			bx_clock                  => "1",
			by_clock                  => "0",
			bz_clock                  => "none",
			coef_sel_a_clock          => "none",
			coef_sel_b_clock          => "none",
			sub_clock                 => "none",
			sub_pipeline_clock        => "none",
			negate_clock              => "none",
			negate_pipeline_clock     => "none",
			accumulate_clock          => "none",
			accum_pipeline_clock      => "none",
			load_const_clock          => "none",
			load_const_pipeline_clock => "none",
			input_pipeline_clock      => "0",
			output_clock              => "0",
			scan_out_width            => g_WIDTH_ACTIVATION,
			result_a_width            => g_WIDTH_RESULT
		)
		port map (
			ax       => i_WeightA,
			ay       => i_ActivationA,
			scanin   => i_ActivationChain,
			scanout  => o_ActivationChain,
			bx       => i_WeightB,
			by       => i_ActivationB,
			chainin  => i_SumChain,
			chainout => o_SumChain,
			clk(0)   => i_Clk,
			clk(1)   => i_Clk,
			clk(2)   => '0',
			aclr(0)  => i_Reset,
			aclr(1)  => i_Reset,
			ena(0)   => i_Enable,
			ena(1)   => i_WeightsCommit,
			ena(2)   => '0',
			resulta  => o_Result
	);
end architecture behav;
