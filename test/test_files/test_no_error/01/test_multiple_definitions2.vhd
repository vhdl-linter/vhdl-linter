library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;


entity test_multiple_definitions2 is
  port (
    test : out std_ulogic                --vhdl-linter-disable-this-line
    );
end test_multiple_definitions2;

architecture arch of test_multiple_definitions2 is
begin
  block_test : block
    signal test : std_ulogic; -- shadowing of signals is fine
  begin
    test <= test;
  end block;
end architecture;
