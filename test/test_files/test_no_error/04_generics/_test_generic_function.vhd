
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
entity test_generic_function is
  generic (
    function size return integer
    );
  port(
    o_dummy : out integer
    );
end test_generic_function;

architecture rtl of test_generic_function is
begin
  o_dummy <= size;
end architecture;
