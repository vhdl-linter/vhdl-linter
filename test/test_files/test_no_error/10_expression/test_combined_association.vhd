
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package test_combined_association is
end package;
package body test_combined_association is
  function local_to_hxstring (A : std_ulogic_vector; IsSigned : boolean := true) return string is -- vhdl-linter-disable-line unused
  begin
    return "a";
  end function;

  function to_hxstring (A : u_signed) return string is
------------------------------------------------------------
  begin
    -- Test combination of casting in assocation and named formal part
    return local_to_hxstring(std_ulogic_vector(A), IsSigned => true);
  end function to_hxstring;

end package body;
