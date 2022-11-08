library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_multiple_definitions is
  port (
    i_test : in std_ulogic --vhdl-linter-disable-line multiple-definition
    );
end test_multiple_definitions;

architecture arch of test_multiple_definitions is
  signal test : std_ulogic; -- error shall be multiple declaration
begin
  test <= test;
end architecture;
