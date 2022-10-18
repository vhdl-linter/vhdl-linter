library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_multiple_definitions is
  signal test : std_ulogic := '0';      --vhdl-linter-disable-this-line
begin
end test_multiple_definitions;

architecture arch of test_multiple_definitions is
  signal test : std_ulogic;             -- error shall be multiple declaration
begin
  test <= test;
end architecture;
