library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_read_written is
  port (
    o : out integer --vhdl-linter-disable-line port-declaration
    );
end test_read_written;
architecture arch of test_read_written is

  signal test : integer;

begin
  o    <= test;
  test <= 1;
end arch;
