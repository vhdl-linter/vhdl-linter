library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
use work.pkg_test.all;

entity test_pkg_reference is
  port (
      i_clk: in pkg_test; -- pkg_test cannot be referenced hier
      o_clk: out std_ulogic
    );
end test_pkg_reference;

architecture arch of test_pkg_reference is
begin
  o_clk <= i_clk;
end arch;
