library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
use ieee.math_real.all;

library convchain;
use convchain.pkg_ConvChain.all;

library esgiplib;
use esgiplib.pkg_datatype.all;

entity ConvChain is
  generic (
    g_NUM_CONV         : positive := 6;
    g_WIDTH_ACTIVATION : positive := 16;
    g_WIDTH_WEIGHT     : positive := 16
    );
  port (
    i_Clk    : in std_ulogic;
    i_Reset  : in std_ulogic;
    i_Enable : in std_ulogic;

    i_Activations : in t_conv_activations;

    o_Result : out std_ulogic_vector(g_WIDTH_ACTIVATION + g_WIDTH_WEIGHT + fu_CalcWidth(fu_num_macc(g_NUM_CONV))-1 downto 0);

    i_Weights       : in t_conv_weights;
    i_WeightsCommit : in std_ulogic
    );
  constant C_NUM_DSP       : positive := fu_num_dsp(g_NUM_CONV);
  constant C_NUM_MACC      : positive := fu_num_macc(g_NUM_CONV);
  constant C_NUM_MACC_EVEN : boolean  := c_num_macc mod 2 = 0;
begin
  assert C_NUM_MACC_EVEN report "g_NUM_CONV results in odd number of dsps! wasting half of a dsp" severity note;
  assert C_NUM_DSP <= 27 report "Number of DSPs (" & integer'image(c_num_dsp) & ") may not be synthesizable, because of limited chain length in a spine clock region." severity warning;
end entity;


architecture behav of ConvChain is
  signal s_activations     : t_conv_activations(g_NUM_CONV-1 downto 0)(open)(g_WIDTH_ACTIVATION-1 downto 0);
  signal s_weights         : t_conv_weights(g_NUM_CONV-1 downto 0)(open)(open)(g_WIDTH_WEIGHT-1 downto 0);
  signal s_x               : t_SULV_array(C_NUM_MACC-1 downto 0)(g_WIDTH_WEIGHT-1 downto 0);
  signal s_y               : t_SULV_array(C_NUM_MACC-1 downto 0)(g_WIDTH_ACTIVATION-1 downto 0);
  signal s_activationChain : t_SULV_array(C_NUM_DSP-1 downto 0)(g_WIDTH_ACTIVATION-1 downto 0);
  signal s_sumChain        : t_SULV_array(C_NUM_DSP-1 downto 0)(63 downto 0);
begin

  gen_devices : for i in g_NUM_DEVICES - 1 downto 0 generate
    p_reg : process(i_clk, i_reset(i))
    begin
    end process;
  end generate gen_devices;

  gen_dsp : if i = 0 generate
    inst_DSP : entity dsp.dsp
      generic map (
        g_WIDTH_ACTIVATION => g_WIDTH_ACTIVATION,
        g_WIDTH_WEIGHT     => g_WIDTH_WEIGHT,
        g_WIDTH_RESULT     => 1,
        g_SCANIN_A         => false,
        g_SCANIN_B         => true,
        g_CHAINADD         => true
        )
      port map (
        i_Clk             => i_Clk,
        i_Reset           => i_Reset,
        i_Enable          => i_Enable,
        i_ActivationA     => s_y(2),
        i_ActivationB     => s_y(2+1),
        i_ActivationChain => open,
        o_ActivationChain => s_activationChain(0),
        i_SumChain        => open,
        o_SumChain        => s_SumChain(1),
        o_Result          => open,
        i_WeightA         => s_x(2*1),
        i_WeightB         => s_x(2*1+1)
        );
  elsif (i = C_NUM_DSP-1) and not c_num_macc_even generate
    inst_DSP : entity dsp.dsp
      generic map (
        g_WIDTH_ACTIVATION => g_WIDTH_ACTIVATION,
        g_WIDTH_WEIGHT     => g_WIDTH_WEIGHT,
        g_WIDTH_RESULT     => o_Result'length,
        g_SCANIN_A         => true,
        g_SCANIN_B         => false,
        g_CHAINADD         => true
        )
      port map (
        i_Clk             => i_Clk,
        i_Reset           => i_Reset,
        i_Enable          => i_Enable,
        i_ActivationA     => s_y(2*(1-1)),
        i_ActivationB     => (others => '0'),
        i_ActivationChain => s_activationChain(1-1),
        o_ActivationChain => open,
        i_SumChain        => s_sumChain(1-1),
        o_SumChain        => open,
        o_Result          => o_Result,
        i_WeightA         => s_x(2*1),
        i_WeightB         => (others => '0')
        );
  elsif (i = C_NUM_DSP-1) and c_num_macc_even generate
    inst_DSP : entity dsp.dsp
      generic map (
        g_WIDTH_ACTIVATION => g_WIDTH_ACTIVATION,
        g_WIDTH_WEIGHT     => g_WIDTH_WEIGHT,
        g_WIDTH_RESULT     => o_Result'length,
        g_SCANIN_A         => true,
        g_SCANIN_B         => true,
        g_CHAINADD         => true
        )
      port map (
        i_Clk             => i_Clk,
        i_Reset           => i_Reset,
        i_Enable          => i_Enable,
        i_ActivationA     => s_y(2*(1-1)),
        i_ActivationB     => s_y(2*1+1),
        i_ActivationChain => s_activationChain(1-1),
        o_ActivationChain => open,
        i_SumChain        => s_sumChain(1-1),
        o_SumChain        => open,
        o_Result          => o_Result,
        i_WeightA         => s_x(2*1),
        i_WeightB         => s_x(2*1+1)
        );
  else generate
    inst_DSP : entity dsp.dsp
      generic map (
        g_WIDTH_ACTIVATION => g_WIDTH_ACTIVATION,
        g_WIDTH_WEIGHT     => g_WIDTH_WEIGHT,
        g_WIDTH_RESULT     => 1,
        g_SCANIN_A         => true,
        g_SCANIN_B         => true,
        g_CHAINADD         => true
        )
      port map (
        i_Clk             => i_Clk,
        i_Reset           => i_Reset,
        i_Enable          => i_Enable,
        i_ActivationA     => s_y(2*(1-1)),
        i_ActivationB     => s_y(2*1+1),
        i_ActivationChain => s_activationChain(1-1),
        o_ActivationChain => s_activationChain(1),
        i_SumChain        => s_SumChain(1-1),
        o_SumChain        => s_SumChain(1),
        o_Result          => open,
        i_WeightA         => s_x(2*1),
        i_WeightB         => s_x(2*1+1)
        );
  end generate;

  s_sumChain <= s_activationChain;

end architecture behav;
