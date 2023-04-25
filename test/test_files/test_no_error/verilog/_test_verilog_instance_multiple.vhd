library ieee;
use ieee.std_logic_1164.all;
entity test_verilog_instance is
end entity;
architecture arch of test_verilog_instance is
  signal in_bit  : std_ulogic;
  signal out_bit : std_ulogic;
begin
  test_multiple_module1 : entity work.test_multiple_module1
    port map (
      in_bit  => in_bit,
      out_bit => out_bit);
  test_multiple_module2 : entity work.test_multiple_module2
    port map (
      in_bit2  => out_bit,
      out_bit2 => in_bit);
end architecture;
