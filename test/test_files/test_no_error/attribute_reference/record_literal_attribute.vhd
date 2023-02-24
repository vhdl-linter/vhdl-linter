library ieee;
use ieee.std_logic_1164.all;
package record_literal_attribute is
  type t_rec is record
    prop : std_ulogic_vector;
  end record;
end package;

package body record_literal_attribute is
  function InitAxi4LiteReadAddressRec (foo : std_ulogic_vector)  -- foo is read via attribute reference
    return t_rec is
  begin
    return (
      prop => (foo'range => '0') 
      );
  end function InitAxi4LiteReadAddressRec;
end package body;
