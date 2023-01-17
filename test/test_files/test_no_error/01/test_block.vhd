library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_block is
  port (
    i_clk : in std_ulogic
    );
end test_block;

architecture arch of test_block is
begin
  p_block0 : block
    signal s : std_ulogic;

  begin
    s <= s;
  end block;

  p_block1 : block is
    signal s : std_ulogic;
  begin
    s <= s;
  end block;

  p_block2 : block is
    signal s : std_ulogic;
  begin
    s <= s;
  end block p_block2;


  p_block3 : block(rising_edge(i_clk))
    signal s : std_ulogic;
  begin
    s <= guarded s;
  end block p_block3;

  p_block4 : block(rising_edge(i_clk)) is
    signal s : std_ulogic;
  begin
    s <= '1' when GUARD else s;
  end block p_block4;

  p_block5 : block(rising_edge(i_clk))
    signal s : std_ulogic;
  begin
    s <= guarded transport s;
  end block p_block5;

  p_block6 : block(rising_edge(i_clk))
    signal s : std_ulogic;
  begin
    s <= reject 5 ms inertial s;
  end block p_block6;

  p_block7 : block(rising_edge(i_clk))
    signal s : std_ulogic;
  begin
    s <= guarded reject 5 ms inertial s;
  end block p_block7;

end arch;
