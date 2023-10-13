library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_multiple_definitions is
  port (
    test : in std_ulogic --vhdl-linter-disable-line multiple-definition port-declaration unused
    );
end test_multiple_definitions;

architecture arch of test_multiple_definitions is
  signal test : std_ulogic; -- error shall be multiple definition
begin
  test <= test;
end architecture;
