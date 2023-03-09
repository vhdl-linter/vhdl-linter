package body pkg is
  type rec is record
    elem: integer;
  end record;
  type arrayType is array (natural range <>) of rec;

  procedure proc(par: out arrayType) is
    alias ali: arrayType(1 to 2) is par;
  begin
    ali(1).elem := 1;
  end procedure;
end package body;