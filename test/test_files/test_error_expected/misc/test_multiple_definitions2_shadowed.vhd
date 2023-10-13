library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;


entity test_multiple_definitions2 is
  port (
    o_test : out std_ulogic             -- is hidden -> unused

    );
end test_multiple_definitions2;

architecture arch of test_multiple_definitions2 is
begin
  block_test : block
    signal o_test : std_ulogic;         -- shadowing of signals is fine
  begin
    o_test <= o_test;
  end block;
end architecture;
