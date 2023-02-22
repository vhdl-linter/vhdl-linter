library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_entity_assert is
  port (
      i_clk: in std_ulogic;
      o_clk: out std_ulogic
    );
begin
  assert true report "Failure";
  assert true report "Failure" severity failure;
end test_entity_assert;

architecture arch of test_entity_assert is
begin
  o_clk <= i_clk;
end arch;
