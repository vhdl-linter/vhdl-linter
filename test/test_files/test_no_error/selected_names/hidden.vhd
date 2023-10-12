package shadowed is
  type protected_type is protected
    impure function NewID(Name : string) return integer;
  end protected;
  shared variable protected_variabe : protected_type;

  ------------------------------------------------------------
  impure function NewID (
    Name : string
    ) return integer;

end package;
package body shadowed is
  impure function NewID (
    Name : string
    ) return integer is
  begin
    return protected_variabe.NewID(Name);
  end function NewID;

end package body;
