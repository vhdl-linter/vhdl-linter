library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity pkg_reference is

end pkg_reference;

architecture arch of pkg_reference is
  signal a : std_ulogic; -- No error here
begin
  a <= a;

end architecture;

entity pkg_reference2 is
end pkg_reference2;

architecture arch of pkg_reference2 is
  signal a : std_ulogic;  -- Error here std_ulogic is not declared. (Use clauses for upper entity)

begin
  a <= a;

end architecture;
