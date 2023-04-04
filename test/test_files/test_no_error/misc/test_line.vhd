library ieee;
use ieee.std_logic_1164.all;
use std.textio.all;
entity test_line is
end entity;
architecture arch of test_line is
  procedure read(a : inout line; b : std_ulogic_vector; c : boolean; d : std_ulogic) is -- vhdl-linter-disable-line unused
  begin
  end;
  alias BREAD is READ [line, std_ulogic_vector, boolean, std_ulogic];

begin
end architecture;
